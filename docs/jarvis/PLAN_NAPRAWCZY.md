# Plan naprawczy ekosystemu Jarvis

**Źródło:** audyt Opus (2026-08-11) + wstępny audyt Composer  
**Cel:** jakość danych w Google Sheets dla Gemini Gema (Trener AI)  
**Repozytorium:** `c:\Jarvis\JJ-Workout-Tool` · GitHub `Jurchesco/jj-workout-tool`

> **Dla agenta / kolejnych sesji:** przy każdej naprawie odwołuj się do tego pliku (`@docs/jarvis/PLAN_NAPRAWCZY.md`). Po ukończeniu zadania zmień status na `done` i dopisz datę w kolumnie „Ukończono”.

---

## Status zadań

| Symbol | Znaczenie |
|--------|-----------|
| `todo` | Do zrobienia |
| `in_progress` | W trakcie |
| `done` | Ukończone |
| `blocked` | Czeka na decyzję użytkownika (patrz sekcja H) |
| `wontfix` | Świadomie pominięte |

**Postęp:** 2 / 28 zadań ukończonych (ostatnia aktualizacja: 2026-09-07)

---

## Executive summary

Pipeline jest **architektonicznie poprawny** (upsert, batch 429, RLS, migracja Cialo). Główne problemy to **`Silownia_import`** (semantyka kolumn, limit Supabase 1000 wierszy, brak `user_id`) oraz **rozjazd instrukcji Gema z kodem**.

**TOP 5 — kolejność wdrożenia:**

1. **0.1** — filtr dat + paginacja Supabase (cichy zanik danych siłowych)
2. **0.2** — notatki ćwiczenia → `Uwagi`, `Bol / Niggle` puste
3. **0.5** — patch `GEM_INSTRUKCJA.md` + wklejenie do Gema
4. **0.3** — PR po Est. 1RM, klucz po nazwie ćwiczenia
5. **2.1** — zakładka **Meta** (świeżość importu)

---

## Faza 0 — Quick wins (~1 dzień)

Bez nowych funkcji w aplikacji. Najwyższy ROI dla Gema.

| ID | Status | Zadanie | Pliki | Kryterium „done” | Wpływ |
|----|--------|---------|-------|------------------|-------|
| **0.1** | `done` | Filtr dat w zapytaniach Supabase + osobne lekkie zapytanie po pełną historię PR (poza limitem 1000 wierszy) | `importers/workout.py`, `dates.py` | Import `--all` / `--days 30` zwraca wszystkie serie z zakresu; PR liczone z pełnej historii | **Wysoki** |
| **0.2** | `todo` | Notatki ćwiczenia → kolumna `Uwagi`; `Bol / Niggle` zostawić puste (brak źródła bólu w appce) | `importers/workout.py:125-137` | Po imporcie: `Uwagi` = tekst z sesji ćwiczenia, `Bol / Niggle` puste | **Wysoki** |
| **0.3** | `todo` | PR po **Est. 1RM (Brzycki)**, nie max ciężar; klucz PR po **nazwie ćwiczenia**, nie `exercise_id` | `importers/workout.py:92-111` | Seria 95×8 dostaje PR po serii 100×1 jeśli Est. 1RM wyższe | **Wysoki** |
| **0.4** | `todo` | Wiersz błędu w `daily.py` — upewnić się, że ma **21 pól** (Uwagi w kolumnie U) | `importers/daily.py:75-78` | Przy symulowanym błędzie Garmin komunikat w kolumnie U | Średni |
| **0.5** | `todo` | Aktualizacja `GEM_INSTRUKCJA.md` według sekcji E audytu + **wklejenie do Gema** | `docs/jarvis/GEM_INSTRUKCJA.md`, Gem UI | Gem nie alarmuje o „kontuzji” z notatek technicznych; zna PR/typy Sen | **Wysoki** |
| **0.6** | `done` | `DEFAULT_DAYS: "3"` w workflow (bufor samonaprawy) | `.github/workflows/jarvis-import.yml` | Cron godzinowy odświeża dziś+wczoraj+przedwczoraj (2026-09-07) | Średni |

### Szczegóły implementacji 0.1

```python
# workout.py — filtr logów po dacie (zamiast pobierania wszystkiego)
start_iso = f"{ctx.start_date.isoformat()}T00:00:00+00:00"
end_iso = f"{ctx.end_date.isoformat()}T23:59:59+00:00"
logs_resp = (
    supabase.table("session_set_logs")
    .select("session_id, exercise_id, set_number, reps, weight_kg, completed_at")
    .gte("completed_at", start_iso)
    .lte("completed_at", end_iso)
    .order("completed_at")
    .execute()
)

# Osobno: lekkie zapytanie max(weight,reps) per nazwa ćwiczenia dla PR
# (paginacja .range(0,999) w pętli jeśli historia > 1000)
```

### Szczegóły implementacji 0.2

```python
rows_to_upsert.append([
    ..., "Tak" if is_pr else "",
    "",                                    # Bol / Niggle — brak dedykowanego pola
    exercise_notes.get(note_key, ""),      # Uwagi = notatka ćwiczenia (RPE, wskazówki)
    set_time,
])
```

---

## Faza 1 — Spójność semantyczna (2–3 dni)

| ID | Status | Zadanie | Pliki | Kryterium „done” | Wpływ |
|----|--------|---------|-------|------------------|-------|
| **1.1** | `blocked` | Filtr `JJ_WORKOUT_USER_ID` / `user_id` w importerze | `config.py`, `workout.py`, `.env.example`, workflow | Sesja obcego konta nie trafia do arkusza | **Wysoki** (jeśli Vercel publiczny) |
| **1.2** | `done` | Odporny klucz upsert Silownia (`Session ID` + `Exercise ID`, fallback `Data|Cwiczenie` + normalizacja PL) | `dates.py`, `workout.py`, `importWorkout.ts` | Dwa kolejne importy → `dopisano 0` (po backfill ID) | **Wysoki** |
| **1.3** | `todo` | `restlessMomentsCount` z Garmina zamiast własnego liczenia | `importers/sleep.py:114-119` | Kolumna `Niespokojne momenty` > 0 gdy Garmin raportuje | Średni |
| **1.4** | `todo` | Rename nagłówka `Tętno min. średnie`; guard Brzycki `reps > 15`; tempo `"5:30 /km"` | `daily.py`, `workout.py`, `activities.py`, `docs/jarvis/GEM_INSTRUKCJA.md` | Brak absurdalnych Est. 1RM; tempo nie jako godzina w Sheets | Średni |
| **1.5** | `todo` | `date.today()` → data w `Europe/Warsaw`; filtr `<= end_date` w aktywnościach; `utcfromtimestamp` → `fromtimestamp(tz=utc)` | `config.py`, `activities.py`, `sleep.py` | Brak DeprecationWarning w CI | Niski |
| **1.6** | `todo` | Early break paginacji aktywności (przerwa gdy strona starsza niż `start_date`) | `importers/activities.py:179-188` | Mniej wywołań API; log 1–2 paczek zamiast 20 | Średni |

---

## Faza 2 — Nowe zakładki (3–4 dni)

| ID | Status | Zadanie | Pliki / sposób | Kryterium „done” | Wpływ |
|----|--------|---------|----------------|------------------|-------|
| **2.1** | `todo` | Zakładka **Meta** — log importów (moduł, czas, updated/appended/skipped, błąd) | nowy `importers/meta.py` lub rozszerzenie `cli.py` | Gem widzi datę ostatniego sync | **Wysoki** |
| **2.2** | `todo` | Zakładka **Samopoczucie** (ręczna lub Form): Data, Energia 1–5, Nastrój, Motywacja, Ból, Notatka | arkusz + `docs/jarvis/GEM_INSTRUKCJA.md` | Gem ma subiektywny kontekst | **Wysoki** |
| **2.3** | `todo` | Zakładka **Suplementy** — dzienny log + FK do `Baza_Suplementow` | arkusz + Gem | Korelacja suplement ↔ sen | Średni |

> Fazy 2.2 i 2.3 można zacząć **ręcznie w arkuszu** (bez kodu), potem opisać w Gemie.

---

## Faza 3 — JJ Workout Tool (4–6 dni)

| ID | Status | Zadanie | Pliki | Kryterium „done” | Wpływ |
|----|--------|---------|-------|------------------|-------|
| **3.1** | `todo` | Osobne pole **ból / niggle** w sesji (nie szablonie) | `schema.sql`, `client.ts`, `workout/[id].tsx`, `workout.py` | Ból trafia do `Bol / Niggle` | **Wysoki** |
| **3.2** | `todo` | Pole **RPE** (1–10) per seria + export | schema, app, `workout.py` | Kolumna `RPE` w arkuszu | **Wysoki** |
| **3.3** | `todo` | Notatka **sesji** przy „Zakończ trening" | `workout/[id].tsx`, `client.ts` | `Uwagi` sesji wypełnione (jeden wiersz logiczny) | Średni |
| **3.4** | `todo` | Odtwarzanie ukończonych serii po restarcie app | `workout/[id].tsx:63,81` | Powrót do sesji pokazuje checkmarki | Średni |
| **3.5** | `blocked` | Kolumna `Sesja zakończona` (Tak/Nie) lub filtr `completed_at IS NOT NULL` | `workout.py` | Gem wie, czy sesja porzucona | Średni |

---

## Faza 4 — Operacje (2–3 dni)

| ID | Status | Zadanie | Opis |
|----|--------|---------|------|
| **4.1** | `todo` | Alert przy fail workflow | `if: failure()` → e-mail / Discord |
| **4.2** | `todo` | Cotygodniowy reconcile | Scheduled `--days 14` lub skrypt porównujący luki |
| **4.3** | `todo` | Rotacja / alert wygasających tokenów Garmin | dokumentacja + przypomnienie |
| **4.4** | `todo` | Nagłówki wymuszane w kodzie dla Sen/Dzien/Forma/Aktywnosci | wzorzec jak `openscale.py` |

---

## Bugi — rejestr (audyt Opus)

| ID | Priorytet | Opis | Status |
|----|---------|------|--------|
| D-1 | P0 | Limit 1000 wierszy Supabase bez paginacji | → zadanie **0.1** |
| D-2 | P0 | Klucz upsert vs lokalizacja arkusza (PL → duplikaty) | → **1.2**; weryfikacja H-1 |
| D-3 | P1 | PR = max ciężar ≠ Gem (Est. 1RM) | → **0.3** |
| D-4 | P1 | `Bol / Niggle` = notatki techniczne z szablonu | → **0.2** |
| D-5 | P1 | `Uwagi` zawsze puste (brak UI sesji) | → **0.2** tymczasowo; **3.3** docelowo |
| D-6 | P1 | Wiersz błędu `daily.py` (kolumny) | → **0.4** |
| D-7 | P1 | Brak filtra `user_id` | → **1.1** |
| D-8 | P2 | `minAvgHeartRate` ≠ średnie tętno dnia | → **1.4** + Gem |
| D-9 | P2 | `Niespokojne momenty` prawdopodobnie zawsze 0 | → **1.3** |
| D-10 | P2 | Limit 1000 aktywności Garmin | → **1.6** |
| D-11 | P2 | Brak filtra `end_date` w aktywnościach | → **1.5** |
| D-12 | P2 | `date.today()` UTC na CI | → **1.5** |
| D-13 | P2 | `DEFAULT_DAYS=1` zostawiało wczorajszy Dzien przy wieczornym zrzucie | **done** 2026-09-07 → **0.6** (`DEFAULT_DAYS: 3`) |
| D-14 | P2 | Brzycki bez limitu powtórzeń | → **1.4** |
| D-15 | P2 | App nie odtwarza stanu serii | → **3.4** |
| D-16 | P2 | Tempo `"5:30"` → godzina w Sheets | → **1.4** |

### Obalone / do weryfikacji na żywych danych

| Hipoteza | Werdykt | Akcja |
|----------|---------|-------|
| Bug timezone godzin snu (`sleep.py`) | **Prawdopodobnie fałsz** (Opus) — epoch Local od Garmina | Porównaj 1 noc z Garmin Connect przed fixem |
| Wiersz błędu `daily.py` = 20 pól | **Niepewne** (Opus vs przeliczenie = 21) | Test symulowany błąd w **0.4** |

---

## Sekcja E — patch Gema (do wklejenia / do merge w GEM_INSTRUKCJA.md)

Wykonaj w ramach zadania **0.5**. Pełne fragmenty tekstu — w historii audytu Opus lub poniżej skrót:

1. **PR** — dopóki kod nie naprawiony: max ciężar, nie Est. 1RM; progres oceniaj po Est. 1RM i Volume.
2. **Bol / Niggle** — nie interpretuj jako ból; to notatki techniczne / szablon.
3. **Uwagi** — obecnie notatki ćwiczenia (po 0.2); nie per-seria.
4. **Tętno średnie (Dzien)** — to min. uśrednione HR, nie średnia doby.
5. **Sen** — tekst z jednostkami; `brak danych` ≠ zero.
6. **Opóźnienie importu** — do ~1 h.

---

## Checklist weryfikacji (po Fazie 0)

```bash
cd Scripts/import
venv\Scripts\activate

# Idempotencja Silownia (test D-2)
python -m jarvis_import --no-prompt --only silownia --days 7
python -m jarvis_import --no-prompt --only silownia --days 7
# Oczekiwane: drugi run → dopisano 0

# PR / pełny zakres
python -m jarvis_import --no-prompt --only silownia --days 30
```

**W arkuszu (ręcznie):**

- [x] `Silownia_import` — duplikaty (Session ID + Exercise ID upsert, 2026-08-17)
- [ ] `Bol / Niggle` — czy to wskazówki techniczne powtarzane co sesję?
- [ ] Liczba wierszy `Silownia_import` — czy > 1000?
- [ ] `Sen` — `Godziny snu` vs Garmin Connect (1 noc)
- [ ] `Niespokojne momenty` — czy same zera?

**Scenariusze Gema (po 0.5):**

1. „Czy dziś trenować ciężko?" → konkretne HRV, RHR, Sleep Score z datą
2. „Powtarzająca się kontuzja?" → **nie** z kolumny Bol/Niggle
3. „Progres w wyciskaniu?" → Est. 1RM + Volume, grupowanie po nazwie
4. „Ile ważyłem tydzień temu?" → Cialo + trend
5. „Trenowałem wczoraj?" → po **2.1** odróżnij brak treningu od fail importu

---

## Pytania otwarte (sekcja H — decyzje użytkownika)

| ID | Pytanie | Wpływa na |
|----|---------|-----------|
| **H-1** | Jaka **lokalizacja arkusza** (PL vs US)? Czy są **duplikaty** w Silownia_import? | Pilność **1.2** |
| **H-2** | Czy `Bol / Niggle` zawiera dziś wskazówki techniczne w wielu sesjach? | Pilność **0.2** |
| **H-3** | Czy `Silownia_import` ma **> 1000 wierszy**? | Pilność **0.1** |
| **H-4** | Czy **porzucone sesje** (`completed_at IS NULL`) mają trafiać do arkusza? | **3.5** |
| **H-5** | Czy **publiczny Vercel** zostaje? | **1.1** → P0 vs wyłączyć signup w Supabase |

---

## Powiązane dokumenty

| Plik | Opis |
|------|------|
| [GEM_INSTRUKCJA.md](./GEM_INSTRUKCJA.md) | Instrukcja systemowa Gema |
| [audit/PROMPT.md](../audit/PROMPT.md) | Prompt użyty w audycie Opus |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architektura ekosystemu (ten folder) |
| [SETUP.md](./SETUP.md) | Konfiguracja |

---

## Log zmian planu

| Data | Zmiana |
|------|--------|
| 2026-08-11 | **0.1** — paginacja Supabase, filtr `completed_at`, historia PR przed zakresem |
| 2026-08-11 | Utworzenie planu po audycie Opus |

---

## Jak pracować krok po kroku (dla Ciebie i agenta)

1. Wybierz następne zadanie z TOP 5 lub Fazy 0 (w tej kolejności).
2. W nowym chacie napisz np.: **„Wdróż zadanie 0.1 z @docs/jarvis/PLAN_NAPRAWCZY.md”**.
3. Po merge / teście — zaktualizuj status w tym pliku na `done` + data.
4. Po Fazie 0 — uruchom checklist weryfikacji i odpowiedz na H-1…H-5.

**Następne zadanie do zrobienia:** `0.2`

---

## Stan sesji — zamknięcie 2026-08-11

Sesja zakończona. Pipeline i arkusz **bez dalszych zmian** do jutra (po pierwszym treningu w JJ Workout Tool).

### Ukończone

| Obszar | Stan |
|--------|------|
| Repo / docs | Uporządkowane (`docs/jarvis`, `jj-workout-tool`, `audit`); duplikaty z `c:\Jarvis\` usunięte |
| Audyt | Plan naprawczy + `GEM_INSTRUKCJA.md` |
| **0.1** | Paginacja Supabase, filtr dat UTC, historia PR — **w repo (main)** |
| Arkusz | `Silownia_import` wyczyszczony ręcznie (0 wierszy); `Dzien`/`Sen`/`Forma` ~34 wiersze (Garmin OK) |
| Supabase | Pusta (0 serii) — import siłowni czeka na trening w aplikacji |
| Lokalnie | `Scripts/import/venv/` gotowy; `.env` + service account skonfigurowane |

### Jutro — checklist

1. **Trening w JJ Workout Tool** — zaloguj serie (musi trafić do Supabase).
2. **Import siłowni:**
   ```powershell
   cd c:\Jarvis\JJ-Workout-Tool\Scripts\import
   .\venv\Scripts\python.exe -m jarvis_import --only silownia --days 3
   ```
3. **Arkusz** — sprawdź `Silownia_import` (nagłówek uzupełni kolumnę „Czas serii” automatycznie).
4. **Opcjonalnie** — omów zmiany w uzupełnianiu / kolumnach (0.2+); na dziś **zostawiamy jak jest**.

### Świadomie odłożone

- **0.2–0.6** — po weryfikacji importu z prawdziwymi danymi
- Zmiany w logice uzupełniania arkusza — decyzja użytkownika, później
- **H-1…H-5** — odpowiedzi po pierwszym imporcie siłowni

### Kontynuacja w Cursorze

> „Kontynuuj Jarvis — trening zrobiony, sprawdź import i zadanie 0.2 z @docs/jarvis/PLAN_NAPRAWCZY.md”
