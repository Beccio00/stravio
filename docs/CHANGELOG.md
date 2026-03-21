# Changelog

All notable changes to Stravio.

## [Unreleased]

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
