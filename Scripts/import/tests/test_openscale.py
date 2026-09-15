from __future__ import annotations

import sqlite3
import tempfile
import unittest
import zipfile
from datetime import date, datetime
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo

from jarvis_import.config import date_range
from jarvis_import.dates import today_in_timezone
from jarvis_import.drive import DriveFile, is_openscale_backup_name, pick_latest_backup
from jarvis_import.importers.openscale import (
    COL_DATETIME,
    COL_WEIGHT,
    build_measurements_query,
    extract_db_path,
    measurement_type_predicate,
    read_openscale_rows,
    zip_db_members,
)
from jarvis_import.openscale_source import iter_local_openscale_backups, pick_latest_local_backup


WARSAW = ZoneInfo("Europe/Warsaw")


def _create_openscale_db(path: Path, measurements: list[tuple[int, int, float]]) -> None:
    """Schema openScale ≤15: MeasurementType.key = 'WEIGHT'."""
    con = sqlite3.connect(path)
    try:
        con.execute("CREATE TABLE Measurement (id INTEGER PRIMARY KEY, timestamp INTEGER)")
        con.execute("CREATE TABLE MeasurementType (id INTEGER PRIMARY KEY, key TEXT)")
        con.execute(
            "CREATE TABLE MeasurementValue ("
            "measurementId INTEGER, typeId INTEGER, floatValue REAL, textValue TEXT)"
        )
        con.execute("INSERT INTO MeasurementType (id, key) VALUES (1, 'WEIGHT')")
        for mid, timestamp_ms, weight in measurements:
            con.execute("INSERT INTO Measurement (id, timestamp) VALUES (?, ?)", (mid, timestamp_ms))
            con.execute(
                "INSERT INTO MeasurementValue (measurementId, typeId, floatValue) VALUES (?, 1, ?)",
                (mid, weight),
            )
        con.commit()
    finally:
        con.close()


def _create_openscale_db_identity(
    path: Path,
    measurements: list[tuple[int, int, float, float | None, str | None]],
) -> None:
    """Schema openScale ≥16: MeasurementType.identity = 'builtin.weight' (produkcja 2026-09)."""
    con = sqlite3.connect(path)
    try:
        con.execute(
            "CREATE TABLE Measurement ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, "
            "userId INTEGER NOT NULL, timestamp INTEGER NOT NULL)"
        )
        con.execute(
            "CREATE TABLE MeasurementType ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, "
            "identity TEXT NOT NULL, name TEXT, color INTEGER NOT NULL, "
            "icon TEXT NOT NULL, unit TEXT NOT NULL, inputType TEXT NOT NULL, "
            "displayOrder INTEGER NOT NULL, isDerived INTEGER NOT NULL, "
            "isEnabled INTEGER NOT NULL, isPinned INTEGER NOT NULL, "
            "isOnRightYAxis INTEGER NOT NULL, isInternal INTEGER NOT NULL)"
        )
        con.execute(
            "CREATE TABLE MeasurementValue ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, "
            "measurementId INTEGER NOT NULL, typeId INTEGER NOT NULL, "
            "floatValue REAL, intValue INTEGER, textValue TEXT, dateValue INTEGER)"
        )
        types = [
            (1, "builtin.weight", "FLOAT"),
            (2, "builtin.bmi", "FLOAT"),
            (3, "builtin.body_fat", "FLOAT"),
            (31, "builtin.comment", "TEXT"),
        ]
        for type_id, identity, input_type in types:
            con.execute(
                "INSERT INTO MeasurementType "
                "(id, identity, name, color, icon, unit, inputType, displayOrder, "
                "isDerived, isEnabled, isPinned, isOnRightYAxis, isInternal) "
                "VALUES (?, ?, NULL, 0, 'IC_DEFAULT', 'NONE', ?, 0, 0, 1, 0, 0, 0)",
                (type_id, identity, input_type),
            )
        for mid, timestamp_ms, weight, bmi, comment in measurements:
            con.execute(
                "INSERT INTO Measurement (id, userId, timestamp) VALUES (?, 1, ?)",
                (mid, timestamp_ms),
            )
            con.execute(
                "INSERT INTO MeasurementValue (measurementId, typeId, floatValue) VALUES (?, 1, ?)",
                (mid, weight),
            )
            if bmi is not None:
                con.execute(
                    "INSERT INTO MeasurementValue (measurementId, typeId, floatValue) VALUES (?, 2, ?)",
                    (mid, bmi),
                )
            if comment:
                con.execute(
                    "INSERT INTO MeasurementValue (measurementId, typeId, textValue) VALUES (?, 31, ?)",
                    (mid, comment),
                )
        con.commit()
    finally:
        con.close()


class DriveSelectionTests(unittest.TestCase):
    def test_is_openscale_backup_name(self):
        self.assertTrue(is_openscale_backup_name("openScale.db_auto_backup.zip"))
        self.assertTrue(is_openscale_backup_name("openscale_backup_1787123462988.zip"))
        self.assertFalse(is_openscale_backup_name("openScale.db"))
        self.assertFalse(is_openscale_backup_name("notes.txt"))
        self.assertFalse(is_openscale_backup_name("openScale.csv"))

    def test_pick_latest_prefers_epoch_filename_over_stale_auto_backup(self):
        stale_auto = DriveFile(
            id="auto",
            name="openScale.db_auto_backup.zip",
            modified_time="2026-08-19T04:59:16.000Z",
            size=14000,
        )
        fresh_dated = DriveFile(
            id="dated",
            name="openscale_backup_1787123462988.zip",
            modified_time="2026-08-19T07:11:02.000Z",
            size=17000,
        )
        chosen = pick_latest_backup([stale_auto, fresh_dated])
        self.assertEqual(chosen.id, "dated")


class LocalBackupTests(unittest.TestCase):
    def test_picks_newer_dated_backup_over_stale_auto(self):
        with tempfile.TemporaryDirectory() as raw:
            folder = Path(raw)
            auto = folder / "openScale.db_auto_backup.zip"
            dated = folder / "openscale_backup_1787123462988.zip"
            auto.write_bytes(b"PK\x03\x04auto")
            dated.write_bytes(b"PK\x03\x04dated")
            import os

            os.utime(auto, (1_700_000_000, 1_700_000_000))
            os.utime(dated, (1_600_000_000, 1_600_000_000))

            candidates = iter_local_openscale_backups(auto)
            self.assertEqual(len(candidates), 2)
            self.assertEqual(pick_latest_local_backup(candidates), dated)


class ZipExtractTests(unittest.TestCase):
    def test_zip_db_members_nested_path(self):
        db_name, sidecars = zip_db_members(
            ["folder/openScale.db", "folder/openScale.db-wal", "folder/openScale.db-shm", "readme.txt"]
        )
        self.assertEqual(db_name, "folder/openScale.db")
        self.assertEqual(sidecars, ["folder/openScale.db-wal"])

    def test_reads_wal_from_nested_zip(self):
        with tempfile.TemporaryDirectory() as raw:
            tmp = Path(raw)
            db_path = tmp / "openScale.db"
            con = sqlite3.connect(db_path)
            con.execute("PRAGMA journal_mode=WAL")
            con.execute("CREATE TABLE Measurement (id INTEGER PRIMARY KEY, timestamp INTEGER)")
            con.execute("CREATE TABLE MeasurementType (id INTEGER PRIMARY KEY, key TEXT)")
            con.execute(
                "CREATE TABLE MeasurementValue ("
                "measurementId INTEGER, typeId INTEGER, floatValue REAL, textValue TEXT)"
            )
            con.execute("INSERT INTO MeasurementType (id, key) VALUES (1, 'WEIGHT')")
            con.execute(
                "INSERT INTO Measurement (id, timestamp) VALUES (1, ?)",
                (1_724_000_000_000,),
            )
            con.execute(
                "INSERT INTO MeasurementValue (measurementId, typeId, floatValue) VALUES (1, 1, 80.0)"
            )
            con.commit()
            con.execute(
                "INSERT INTO Measurement (id, timestamp) VALUES (2, ?)",
                (1_724_086_400_000,),
            )
            con.execute(
                "INSERT INTO MeasurementValue (measurementId, typeId, floatValue) VALUES (2, 1, 81.5)"
            )
            con.commit()
            wal_path = tmp / "openScale.db-wal"
            shm_path = tmp / "openScale.db-shm"
            self.assertTrue(wal_path.exists(), "SQLite WAL nie powstał — test środowiska")
            # Indeks SHM z „telefonu”: poprawny rozmiar, psuje odczyt jeśli go użyć.
            shm_path.write_bytes(b"\x00" * 32768)

            zip_path = tmp / "backup.zip"
            with zipfile.ZipFile(zip_path, "w") as archive:
                archive.write(db_path, "nested/openScale.db")
                archive.write(wal_path, "nested/openScale.db-wal")
                archive.write(shm_path, "nested/openScale.db-shm")

            rows = read_openscale_rows(zip_path, WARSAW)
            weights = [row[COL_WEIGHT] for row in rows]
            self.assertEqual(len(rows), 2)
            self.assertEqual(weights, [80.0, 81.5])

    def test_extract_db_path_from_plain_db(self):
        with tempfile.TemporaryDirectory() as raw:
            db_path = Path(raw) / "openScale.db"
            _create_openscale_db(db_path, [(1, 1_724_000_000_000, 97.4)])
            extracted = extract_db_path(db_path)
            self.assertEqual(extracted, db_path)
            rows = read_openscale_rows(db_path, WARSAW)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0][COL_WEIGHT], 97.4)
            self.assertTrue(rows[0][COL_DATETIME].startswith("20"))


class MeasurementTypeSchemaTests(unittest.TestCase):
    def test_predicate_uses_identity_when_present(self):
        self.assertEqual(
            measurement_type_predicate({"identity", "name"}, "WEIGHT"),
            "mt.identity = 'builtin.weight'",
        )
        self.assertEqual(
            measurement_type_predicate({"identity", "name"}, "BODY_FAT"),
            "mt.identity = 'builtin.body_fat'",
        )

    def test_predicate_falls_back_to_legacy_key(self):
        self.assertEqual(
            measurement_type_predicate({"key", "id"}, "WEIGHT"),
            "mt.key = 'WEIGHT'",
        )

    def test_predicate_prefers_identity_over_legacy_key(self):
        self.assertEqual(
            measurement_type_predicate({"key", "identity"}, "COMMENT"),
            "mt.identity = 'builtin.comment'",
        )

    def test_unknown_schema_raises(self):
        with self.assertRaisesRegex(RuntimeError, "identity ani key"):
            measurement_type_predicate({"id", "name"}, "WEIGHT")

    def test_query_does_not_reference_mt_key_on_identity_schema(self):
        sql = build_measurements_query({"identity"})
        self.assertNotIn("mt.key", sql)
        self.assertIn("mt.identity = 'builtin.weight'", sql)
        self.assertIn("mt.identity = 'builtin.comment'", sql)

    def test_reads_identity_schema_like_production_backup(self):
        """Reprodukuje błąd CI: 'no such column: mt.key' na backupie openScale ≥16."""
        with tempfile.TemporaryDirectory() as raw:
            db_path = Path(raw) / "openScale.db"
            _create_openscale_db_identity(
                db_path,
                [
                    (7, 1_786_280_040_000, 99.4, 27.53, None),
                    (26, 1_789_014_240_000, 96.4, 26.70, "rano"),
                ],
            )
            rows = read_openscale_rows(db_path, WARSAW)
            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0][COL_WEIGHT], 99.4)
            self.assertEqual(rows[0][2], 27.53)  # BMI
            self.assertEqual(rows[0][12], "")  # komentarz
            self.assertEqual(rows[1][COL_WEIGHT], 96.4)
            self.assertEqual(rows[1][12], "rano")
            self.assertEqual(rows[1][13], "openScale")

    def test_read_rejects_measurement_type_without_key_or_identity(self):
        with tempfile.TemporaryDirectory() as raw:
            db_path = Path(raw) / "openScale.db"
            con = sqlite3.connect(db_path)
            try:
                con.execute("CREATE TABLE Measurement (id INTEGER PRIMARY KEY, timestamp INTEGER)")
                con.execute("CREATE TABLE MeasurementType (id INTEGER PRIMARY KEY, name TEXT)")
                con.execute(
                    "INSERT INTO Measurement (id, timestamp) VALUES (1, 1724000000000)"
                )
                con.commit()
            finally:
                con.close()
            with self.assertRaisesRegex(RuntimeError, "identity ani key"):
                read_openscale_rows(db_path, WARSAW)

    def test_identity_schema_zip_with_wal(self):
        with tempfile.TemporaryDirectory() as raw:
            tmp = Path(raw)
            db_path = tmp / "openScale.db"
            con = sqlite3.connect(db_path)
            con.execute("PRAGMA journal_mode=WAL")
            con.close()
            _create_openscale_db_identity(db_path, [(1, 1_724_000_000_000, 80.0, 24.5, None)])
            zip_path = tmp / "openScale.db_auto_backup.zip"
            with zipfile.ZipFile(zip_path, "w") as archive:
                archive.write(db_path, "openScale.db")
                wal_path = tmp / "openScale.db-wal"
                if wal_path.exists():
                    archive.write(wal_path, "openScale.db-wal")
            rows = read_openscale_rows(zip_path, WARSAW)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0][COL_WEIGHT], 80.0)
            self.assertEqual(rows[0][2], 24.5)


class DateRangeTests(unittest.TestCase):
    def test_today_in_timezone_after_utc_midnight(self):
        class FrozenDatetime(datetime):
            @classmethod
            def now(cls, tz=None):
                moment = datetime(2026, 8, 18, 23, 30, tzinfo=ZoneInfo("UTC"))
                return moment.astimezone(tz) if tz else moment

        with patch("jarvis_import.dates.datetime", FrozenDatetime):
            self.assertEqual(today_in_timezone(WARSAW), date(2026, 8, 19))
            self.assertEqual(today_in_timezone(ZoneInfo("UTC")), date(2026, 8, 18))

    def test_date_range_respects_explicit_end(self):
        start, end = date_range(3, end=date(2026, 8, 19), tz=WARSAW)
        self.assertEqual(end, date(2026, 8, 19))
        self.assertEqual(start, date(2026, 8, 17))


if __name__ == "__main__":
    unittest.main()
