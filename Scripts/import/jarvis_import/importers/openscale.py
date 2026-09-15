from __future__ import annotations

import shutil
import sqlite3
import tempfile
import zipfile
from datetime import date
from pathlib import Path

from ..dates import date_key, format_datetime, timestamp_ms_to_local, today_in_timezone
from ..openscale_source import resolve_openscale_backup
from ..sheets import ImportResult, batch_update_rows
from ..sort_sheets import sort_worksheet_by_name
from . import ImportContext

WORKSHEET_NAME = "Cialo"
SOURCE_NAME = "openScale"

SHEET_HEADERS = [
    "Data pomiaru",
    "Waga (kg)",
    "BMI",
    "% tkanki tłuszczowej est.",
    "Masa mięśniowa est.",
    "LBM est.",
    "Masa kostna est.",
    "% wody est.",
    "Tłuszcz wisceralny est.",
    "BMR est.",
    "Białko % est.",
    "Impedancja",
    "Komentarz",
    "Źródło",
]

# Poprzedni układ (Data + Godzina + DataCzas) — migracja przy imporcie
LEGACY_HEADERS = [
    "Data",
    "Godzina",
    "DataCzas",
    *SHEET_HEADERS[1:],
]

COL_DATETIME = 0
COL_WEIGHT = 1
COL_SOURCE = 13
LAST_COLUMN = "N"


def value_or_blank(value):
    return "" if value is None else value


def number_or_blank(value):
    if value is None:
        return ""
    try:
        num = float(value)
        return round(num, 2)
    except (TypeError, ValueError):
        return value


def zip_db_members(names: list[str]) -> tuple[str, list[str]]:
    """Znajdź openScale.db i plik WAL. SHM z Androida świadomie pomijamy."""
    files = [name for name in names if name and not name.endswith("/") and not name.endswith("\\")]
    db_members = [name for name in files if Path(name).name.lower() == "openscale.db"]
    if not db_members:
        db_members = [name for name in files if Path(name).name.lower().endswith(".db")]
    if not db_members:
        raise RuntimeError("Brak pliku .db w archiwum backupu openScale")
    db_name = db_members[0]
    db_basename = Path(db_name).name.lower()
    wal_members = [
        name
        for name in files
        if Path(name).name.lower() == f"{db_basename}-wal"
    ]
    return db_name, wal_members


def describe_zip_members(backup_path: Path) -> str:
    with zipfile.ZipFile(backup_path) as archive:
        parts = [
            f"{info.filename} ({info.file_size} B)"
            for info in archive.infolist()
            if not info.is_dir()
        ]
    return ", ".join(parts) if parts else "(puste)"


# Historyczne enumy MeasurementTypeKey (openScale ≤15, kolumna `key`) oraz
# tożsamości schema 16+ (`identity` = 'builtin.' + lower(enum)), np. WEIGHT → builtin.weight.
METRIC_TYPES: tuple[tuple[str, str, str], ...] = (
    ("weight", "WEIGHT", "floatValue"),
    ("bmi", "BMI", "floatValue"),
    ("body_fat", "BODY_FAT", "floatValue"),
    ("muscle", "MUSCLE", "floatValue"),
    ("lbm", "LBM", "floatValue"),
    ("bone", "BONE", "floatValue"),
    ("water", "WATER", "floatValue"),
    ("visceral_fat", "VISCERAL_FAT", "floatValue"),
    ("bmr", "BMR", "floatValue"),
    ("protein", "PROTEIN", "floatValue"),
    ("impedance", "IMPEDANCE", "floatValue"),
    ("comment", "COMMENT", "textValue"),
)


def _table_count(con: sqlite3.Connection, table: str) -> int | None:
    try:
        row = con.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()
    except sqlite3.Error:
        return None
    return int(row[0]) if row else 0


def _table_columns(con: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in con.execute(f'PRAGMA table_info("{table}")')}


def measurement_type_predicate(type_columns: set[str], legacy_key: str) -> str:
    """Warunek SQL dopasowujący typ pomiaru w schema `key` albo `identity`."""
    if "identity" in type_columns:
        identity = f"builtin.{legacy_key.lower()}"
        return f"mt.identity = '{identity}'"
    if "key" in type_columns:
        return f"mt.key = '{legacy_key}'"
    raise RuntimeError(
        "Tabela MeasurementType nie ma kolumny identity ani key "
        f"(kolumny: {sorted(type_columns)})"
    )


def describe_measurement_type_schema(type_columns: set[str]) -> str:
    if "identity" in type_columns:
        return "identity (openScale ≥16, builtin.weight)"
    if "key" in type_columns:
        return "key (openScale ≤15, WEIGHT)"
    return f"nieznany ({', '.join(sorted(type_columns)) or 'brak kolumn'})"


def build_measurements_query(type_columns: set[str]) -> str:
    metric_selects = ",\n            ".join(
        f"MAX(CASE WHEN {measurement_type_predicate(type_columns, legacy_key)} "
        f"THEN mv.{value_column} END) AS {alias}"
        for alias, legacy_key, value_column in METRIC_TYPES
    )
    return f"""
        SELECT
            m.id,
            m.timestamp,
            {metric_selects}
        FROM Measurement m
        LEFT JOIN MeasurementValue mv ON mv.measurementId = m.id
        LEFT JOIN MeasurementType mt ON mt.id = mv.typeId
        GROUP BY m.id, m.timestamp
        HAVING weight IS NOT NULL
        ORDER BY m.timestamp
    """


def checkpoint_extracted_wal(db_path: Path) -> None:
    """Zastosuj WAL bez indeksu SHM z telefonu.

    openScale pakuje gorącą kopię działającej bazy (db + wal + shm) bez SQLite
    Backup API. Indeks ``-shm`` z Androida na Linuxie wygląda na poprawny i
    każe SQLite pominąć ramki WAL — wtedy znikają najnowsze pomiary.
    """
    wal_path = db_path.parent / f"{db_path.name}-wal"
    shm_path = db_path.parent / f"{db_path.name}-shm"
    wal_size = wal_path.stat().st_size if wal_path.exists() else 0
    if shm_path.exists():
        shm_path.unlink()
        print(f"  Usuwam {shm_path.name} (indeks WAL z Androida)")

    con = sqlite3.connect(str(db_path))
    try:
        mode = con.execute("PRAGMA journal_mode=WAL").fetchone()[0]
        before = _table_count(con, "Measurement")
        checkpoint = con.execute("PRAGMA wal_checkpoint(FULL)").fetchone()
        after = _table_count(con, "Measurement")
        busy, log_frames, checkpointed = checkpoint or (None, None, None)
        print(
            f"  WAL {wal_size} B, journal_mode={mode}, "
            f"checkpoint busy={busy} log={log_frames} checkpointed={checkpointed}, "
            f"Measurement {before} → {after}"
        )
        if wal_size and log_frames == 0:
            print(
                "  UWAGA: SQLite zignorował WAL (niespójny snapshot z gorącej kopii). "
                "W openScale zrób ręczny backup po zamknięciu aplikacji albo "
                "„eksport bazy” jeszcze raz."
            )
    finally:
        con.close()


def extract_db_path(backup_path: Path) -> Path:
    """Rozpakowuje openScale.db z zip backupu do katalogu tymczasowego.

    openScale pakuje też SQLite WAL (`openScale.db-wal`). Same `.db` bez WAL
    pomija najnowsze pomiary, które jeszcze nie zostały zcheckpointowane.
    Pliku ``-shm`` nie używamy — patrz ``checkpoint_extracted_wal``.
    """
    suffix = backup_path.suffix.lower()
    if suffix == ".zip":
        tmp_dir = Path(tempfile.mkdtemp(prefix="openscale-"))
        with zipfile.ZipFile(backup_path) as archive:
            try:
                db_name, wal_members = zip_db_members(archive.namelist())
            except RuntimeError:
                shutil.rmtree(tmp_dir, ignore_errors=True)
                raise RuntimeError(f"Brak pliku .db w archiwum: {backup_path}") from None
            for member in [db_name, *wal_members]:
                with archive.open(member) as src, (tmp_dir / Path(member).name).open("wb") as dst:
                    dst.write(src.read())

        db_path = tmp_dir / Path(db_name).name
        checkpoint_extracted_wal(db_path)
        return db_path

    if suffix == ".db":
        return backup_path

    raise RuntimeError(f"Nieobsługiwany format backupu openScale: {backup_path}")


def build_row(
    datetime_value: str,
    weight,
    bmi,
    body_fat,
    muscle,
    lbm,
    bone,
    water,
    visceral_fat,
    bmr,
    protein,
    impedance,
    comment,
) -> list:
    return [
        datetime_value,
        number_or_blank(weight),
        number_or_blank(bmi),
        number_or_blank(body_fat),
        number_or_blank(muscle),
        number_or_blank(lbm),
        number_or_blank(bone),
        number_or_blank(water),
        number_or_blank(visceral_fat),
        number_or_blank(bmr),
        number_or_blank(protein),
        number_or_blank(impedance),
        value_or_blank(comment).strip(),
        SOURCE_NAME,
    ]


def read_measurements_from_db(db_path: Path, tz) -> list[list]:
    con = sqlite3.connect(db_path)
    try:
        cur = con.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Measurement'")
        if cur.fetchone() is None:
            raise RuntimeError("Plik backupu nie zawiera tabeli Measurement (niepoprawny backup openScale)")

        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='MeasurementType'")
        if cur.fetchone() is None:
            raise RuntimeError("Plik backupu nie zawiera tabeli MeasurementType (niepoprawny backup openScale)")

        type_columns = _table_columns(con, "MeasurementType")
        query = build_measurements_query(type_columns)
        print(f"  Schema MeasurementType: {describe_measurement_type_schema(type_columns)}")

        cur.execute("SELECT COUNT(*) FROM Measurement")
        measurement_count = int(cur.fetchone()[0])
        columns = _table_columns(con, "Measurement")
        if "userId" in columns:
            dump_sql = "SELECT id, userId, timestamp FROM Measurement ORDER BY timestamp"
        else:
            dump_sql = "SELECT id, NULL, timestamp FROM Measurement ORDER BY timestamp"
        for mid, user_id, timestamp_ms in cur.execute(dump_sql):
            dt = timestamp_ms_to_local(timestamp_ms, tz)
            user_part = f" user={user_id}" if user_id is not None else ""
            print(f"  DB Measurement id={mid}{user_part} {format_datetime(dt)}")

        rows: list[list] = []
        for (
            _mid,
            timestamp_ms,
            weight,
            bmi,
            body_fat,
            muscle,
            lbm,
            bone,
            water,
            visceral_fat,
            bmr,
            protein,
            impedance,
            comment,
        ) in cur.execute(query):
            dt = timestamp_ms_to_local(timestamp_ms, tz)
            rows.append(
                build_row(
                    format_datetime(dt),
                    weight,
                    bmi,
                    body_fat,
                    muscle,
                    lbm,
                    bone,
                    water,
                    visceral_fat,
                    bmr,
                    protein,
                    impedance,
                    comment,
                )
            )
        if measurement_count and measurement_count != len(rows):
            print(
                f"  UWAGA: tabela Measurement ma {measurement_count} wierszy, "
                f"ale z wagą (WEIGHT) odczytano {len(rows)}"
            )
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [name for (name,) in cur.fetchall()]
        if tables:
            counts = []
            for table in tables:
                n = _table_count(con, table)
                if n:
                    counts.append(f"{table}={n}")
            print(f"  Tabele w backupie: {', '.join(counts) if counts else ', '.join(tables)}")
        return rows
    finally:
        con.close()


def read_openscale_rows(source: Path, tz) -> list[list]:
    extracted = source.suffix.lower() == ".zip"
    db_path = extract_db_path(source)
    try:
        return read_measurements_from_db(db_path, tz)
    finally:
        if extracted:
            shutil.rmtree(db_path.parent, ignore_errors=True)


def detect_header_format(headers: list[str]) -> str:
    current = headers[: len(SHEET_HEADERS)]
    legacy = headers[: len(LEGACY_HEADERS)]
    if current == SHEET_HEADERS:
        return "current"
    if legacy == LEGACY_HEADERS:
        return "legacy"
    return "unknown"


def row_from_legacy(raw: list[str]) -> list | None:
    padded = raw + [""] * max(0, len(LEGACY_HEADERS) - len(raw))
    datetime_value = padded[2].strip() or padded[0].strip()
    weight = padded[3].strip()
    source = padded[15].strip() or SOURCE_NAME
    if not datetime_value or not weight:
        return None
    if " " not in datetime_value and padded[1].strip():
        datetime_value = f"{datetime_value} {padded[1].strip()}"
    return build_row(
        datetime_value,
        padded[3],
        padded[4],
        padded[5],
        padded[6],
        padded[7],
        padded[8],
        padded[9],
        padded[10],
        padded[11],
        padded[12],
        padded[13],
        padded[14],
    )


def normalize_sheet_row(raw: list[str], fmt: str) -> list | None:
    if fmt == "current":
        padded = raw + [""] * max(0, len(SHEET_HEADERS) - len(raw))
        if not padded[COL_DATETIME].strip() or not padded[COL_WEIGHT].strip():
            return None
        return padded[: len(SHEET_HEADERS)]
    return row_from_legacy(raw)


def ensure_metric_number_format(worksheet) -> None:
    """Kolumna wagi sformatowana jako Czas zamienia 97 na 00:00:00 przy USER_ENTERED."""
    worksheet.format("B2:L", {"numberFormat": {"type": "NUMBER", "pattern": "0.0"}})


def migrate_worksheet_layout(worksheet) -> None:
    values = worksheet.get_all_values()
    if not values:
        worksheet.update("A1", [SHEET_HEADERS], value_input_option="USER_ENTERED")
        return

    fmt = detect_header_format(values[0])
    if fmt == "unknown":
        raise RuntimeError(
            f"Nagłówki w '{WORKSHEET_NAME}' nie są zgodne.\n"
            f"Oczekiwane: {SHEET_HEADERS}\n"
            f"Lub legacy: {LEGACY_HEADERS}\n"
            f"Znalezione: {values[0][: max(len(SHEET_HEADERS), len(LEGACY_HEADERS))]}"
        )
    if fmt == "current":
        if values[0][: len(SHEET_HEADERS)] != SHEET_HEADERS:
            worksheet.update("A1", [SHEET_HEADERS], value_input_option="USER_ENTERED")
        return

    print("  Migracja układu kolumn Cialo (Data/Godzina/DataCzas → Data pomiaru)...")
    migrated: list[list] = []
    for raw in values[1:]:
        if not any(cell.strip() for cell in raw):
            continue
        row = normalize_sheet_row(raw, "legacy")
        if row:
            migrated.append(row)

    worksheet.update("A1", [SHEET_HEADERS], value_input_option="USER_ENTERED")
    if len(values) > 1:
        worksheet.batch_clear([f"A2:Z{len(values)}"])
    if migrated:
        worksheet.append_rows(migrated, value_input_option="USER_ENTERED")
    print(f"  Przepisano {len(migrated)} wierszy w nowym układzie.")


def make_row_key(row: list, *, fuzzy: bool = False):
    datetime_value = row[COL_DATETIME]
    weight = row[COL_WEIGHT]
    source = row[COL_SOURCE]
    try:
        normalized_weight = f"{float(str(weight).replace(',', '.')):.4f}"
    except (TypeError, ValueError):
        normalized_weight = str(weight).strip()
    source_key = str(source).strip().lower()
    if fuzzy:
        return (date_key(str(datetime_value)), normalized_weight, source_key)
    return (str(datetime_value).strip(), normalized_weight, source_key)


def get_existing_rows_map(worksheet):
    values = worksheet.get_all_values()
    if not values:
        return {}, {}

    fmt = detect_header_format(values[0])
    if fmt == "unknown":
        raise RuntimeError(f"Nieznany układ nagłówków w '{WORKSHEET_NAME}'.")

    exact_map: dict[tuple, int] = {}
    fuzzy_map: dict[tuple, int] = {}
    for row_number, raw in enumerate(values[1:], start=2):
        row = normalize_sheet_row(raw, fmt)
        if not row:
            continue
        exact_map[make_row_key(row)] = row_number
        fuzzy_map[make_row_key(row, fuzzy=True)] = row_number
    return exact_map, fuzzy_map


def resolve_existing_row(existing_exact, existing_fuzzy, row) -> int | None:
    exact = make_row_key(row)
    if exact in existing_exact:
        return existing_exact[exact]
    return existing_fuzzy.get(make_row_key(row, fuzzy=True))


def warn_if_backup_stale(rows: list[list], tz) -> None:
    today = today_in_timezone(tz)
    if not rows:
        print("  UWAGA: backup nie zawiera żadnych pomiarów z wagą.")
        return
    latest = date.fromisoformat(date_key(rows[-1][COL_DATETIME]))
    age_days = (today - latest).days
    if age_days >= 2:
        print(
            f"  UWAGA: najnowszy pomiar w backupie to {latest} ({age_days} dni temu). "
            "Drive przy „nadpisz backup” często tworzy nowy zip (nowe ID) bez udostępnienia. "
            "Udostępnij folder Jarvis/openScale oraz aktualny plik na "
            "garmin-importer@veo-experiments-463809.iam.gserviceaccount.com "
            "i zaktualizuj OPENSCALE_DRIVE_FILE_ID / OPENSCALE_DRIVE_FOLDER_ID."
        )


def import_openscale(ctx: ImportContext) -> ImportResult:
    backup_path = resolve_openscale_backup(ctx.config)
    if backup_path is None:
        return ImportResult("cialo", skipped=1, error="Brak OPENSCALE_BACKUP / OPENSCALE_DRIVE_FILE_ID — pominięto")
    if not backup_path.exists():
        return ImportResult("cialo", error=f"Nie znaleziono backupu: {backup_path}")

    from_date = ctx.config.import_start_date
    to_date = ctx.end_date
    print(f"\n[CIALO] Zakres: {from_date} – {to_date} (backup openScale, niezależnie od --days)")
    print(f"  Backup: {backup_path} ({backup_path.stat().st_size // 1024} KB)")
    if backup_path.suffix.lower() == ".zip":
        print(f"  Zawartość zip: {describe_zip_members(backup_path)}")

    all_rows = read_openscale_rows(backup_path, ctx.config.timezone)
    filtered_rows = [
        row for row in all_rows
        if from_date.isoformat() <= date_key(row[COL_DATETIME]) <= to_date.isoformat()
    ]
    if all_rows:
        first = date_key(all_rows[0][COL_DATETIME])
        last = date_key(all_rows[-1][COL_DATETIME])
        print(f"  Odczytano {len(all_rows)} pomiarów ({first} – {last}), w zakresie: {len(filtered_rows)}")
        print("  Daty w backupie: " + ", ".join(date_key(row[COL_DATETIME]) for row in all_rows))
        dump_path = Path("/tmp/jarvis-import/cialo-measurements.txt")
        dump_path.parent.mkdir(parents=True, exist_ok=True)
        dump_path.write_text(
            "\n".join(
                f"{row[COL_DATETIME]}\t{row[COL_WEIGHT]}"
                for row in all_rows
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"  Dump pomiarów: {dump_path}")
    else:
        print(f"  Odczytano 0 pomiarów, w zakresie: 0")
    warn_if_backup_stale(all_rows, ctx.config.timezone)

    worksheet = ctx.sheets.worksheet(WORKSHEET_NAME)
    migrate_worksheet_layout(worksheet)
    ensure_metric_number_format(worksheet)
    existing_exact, existing_fuzzy = get_existing_rows_map(worksheet)

    updated_count = 0
    appended_rows = []
    pending_updates: list[tuple[int, list]] = []
    skipped_count = 0
    seen_keys = set()

    for row in filtered_rows:
        key = make_row_key(row)
        if key in seen_keys:
            skipped_count += 1
            continue
        seen_keys.add(key)

        row_number = resolve_existing_row(existing_exact, existing_fuzzy, row)
        if row_number is not None:
            pending_updates.append((row_number, row))
        else:
            appended_rows.append(row)

    batch_update_rows(worksheet, pending_updates, LAST_COLUMN)
    updated_count = len(pending_updates)

    if appended_rows:
        worksheet.append_rows(appended_rows, value_input_option="USER_ENTERED")

    sorted_rows = sort_worksheet_by_name(worksheet, WORKSHEET_NAME)
    print(f"  Gotowe: zaktualizowano {updated_count}, dopisano {len(appended_rows)}, posortowano {sorted_rows} wierszy")
    return ImportResult(
        "cialo",
        updated=updated_count,
        appended=len(appended_rows),
        skipped=skipped_count,
    )
