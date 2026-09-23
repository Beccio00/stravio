# Changelog

All notable changes to Stravio.

## [1.2.0] - 2026-09-23

### Added
- **Resume a workout**: an interrupted session can be picked up again from the Home banner or from its sheet (Start becomes Resume); values typed but not yet logged survive leaving the screen, and done sets are restored from the server, so a session resumes after a reinstall or on another device
- **One workout at a time**: starting a workout on another sheet asks for confirmation and closes the open one; sessions untouched for 6 hours close by themselves (completed if sets were logged, discarded if empty)
- **Duplicate a sheet**: a `⋯` menu on each sheet card with Rename / Duplicate / Delete, working the same on web and mobile; the copy lands at the top of the list with all exercises, sets and notes
- **Import / export sheets**: export every sheet as JSON (re-importable backup), CSV (one row per set) or PDF (printable summary), and import back from JSON or CSV — existing sheets are never modified
- **Real Android notifications**: the daily reminder is scheduled through `expo-notifications` with its own monochrome status-bar icon (it was a no-op stub before)
- **Session notes in history**: notes written during a workout are shown in the session detail and carried back to the sheet template when the workout is finished
- **Rest timer settings**: enable/disable the countdown and pick the default rest for new sets
- **Account section**: e-mail and Sign out in Settings
- **New branding**: app icon, Android adaptive icon, splash and web favicon from the new logo; lockup in the README
- **CI**: every pull request runs a type-check, `expo doctor` and a web export

### Changed
- History loads only the month on screen instead of every session ever recorded
- Stats fetch the 10 sessions they chart instead of the whole table
- Android system bars follow the selected theme (dark, light or system)

### Fixed
- App crashed on launch in the APK: two copies of `react-native-safe-area-context` were installed, so Android linked one and the JS bundle loaded the other
- Home and Sheet lists could not be scrolled past the fold on web
- Sheets stayed empty after signing in until a manual reload, and cached data could leak between accounts on the same device
- Settings crashed on web, where `expo-secure-store` has no implementation
- The white system navigation bar at the bottom on Android
- Drag-to-reorder for exercises and the polished sheet/workout screens, lost in an earlier merge
- `expo doctor` failures: Metro no longer replaces Expo's default watch folders, and `react-native-safe-area-context` matches the SDK

---

## [1.1.0] - 2026-04-30

### Changed
- **API client**: Switched from local SQLite / Fastify HTTP to Supabase JS client
- **ID types**: All entity IDs changed from `number` (auto-increment) to `string` (UUID)
- **Root layout**: Removed SQLite migration step; app connects directly to Supabase
- **Shared types**: Added `userId` field to `WorkoutSheet` and `WorkoutSession`
- **Web support**: Expo web export works and deploys to Vercel
- **Auth UX**: Removed role selector from signup UI
- **Signup behavior**: New users are always created as `allievo`
- **Home header**: Removed role badge, profile icon, and display name block from UI
- **Workout sets**: `Done` is now reversible with `Undo` for accidental taps

### Added
- `vercel.json` for Vercel deployment (SPA rewrite rules)
- `docs/` folder with architecture, changelog, and decisions documentation
- `.gitignore` entries for `.vscode/`, `data/`, `*.apk`
- `LICENSE` file with AGPL-3.0 copyleft license

### Removed
- SQLite database initialization from mobile app startup
- Platform-specific API branching (was: SQLite on native, HTTP on web)
- `eas.json.bak` backup file

---

## [0.3.0] - 2026-03-10

### Added
- **Supabase Auth**: Login/signup screens with email + password
- **Role system**: DB role field retained for compatibility, with `allievo` as current default UX
- **Auth context**: `AuthProvider` + `useAuth()` hook with persistent sessions
- **Auth gate**: Auto-redirect to login if not authenticated
- **Profile display**: User avatar and name on home screen
- **Supabase schema**: `supabase/schema.sql` with 7 tables, RLS policies, triggers
- **expo-secure-store**: Secure token storage on native devices

---

## [0.2.0] - 2026-03-09

### Added
- **Workout sessions**: Start workout from sheet, log sets in real-time
- **Session history**: Calendar view with workout day highlights
- **Session detail**: Review completed workout (exercises, sets, weights)
- **Rest timer**: Countdown between sets with skip option
- **Previous session hints**: Shows last session's weight/reps during workout
- **Exercise notes**: Per-exercise notes during workout (auto-copied from template)
- **Weight sync**: KG changes during workout auto-update the sheet template

---

## [0.1.0] - 2026-03-09

### Added
- Initial project setup: Expo + NativeWind monorepo
- **Workout sheets**: Create, view, delete sheets
- **Exercises**: Add exercises to sheets with ordering
- **Exercise sets**: Add/edit/delete sets (weight, reps, rest time)
- **Local SQLite storage**: expo-sqlite + drizzle-orm for offline data
- **Fastify backend**: REST API for web development
- **Dark theme**: Custom dark gym-themed design
- First APK build (86 MB)
