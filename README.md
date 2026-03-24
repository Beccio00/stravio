# Stravio

Stravio is an open source workout sheet manager. Create workout sheets, log sessions in real-time, and track progress on Android, iOS, and Web.

<p align="center">
  <img src="docs/screenshots/login.png" width="200" alt="Login" />
  <img src="docs/screenshots/home.png" width="200" alt="Home" />
  <img src="docs/screenshots/sheet.png" width="200" alt="Sheet Detail" />
  <img src="docs/screenshots/workout.png" width="200" alt="Workout" />
</p>

> **Screenshots**: Place your screenshots in `docs/screenshots/` with the names referenced above.

---

## Vision

Stravio is a free and open source alternative for workout sheet management.
This v1 intentionally keeps the product model simple:

- Every new account is stored as athlete (`allievo`) in the database.
- No role differences are exposed in the UI.
- Multi-role behavior is postponed to a future release.

## Features

- **Workout Sheets** — Create and manage custom workout templates with exercises and sets
- **Real-Time Session Logging** — Start a workout from any sheet, log each set with actual weight and reps
- **Rest Timer** — Automatic countdown between sets with skip option
- **Previous Session Hints** — See what you did last time for each exercise during your workout
- **Session History** — Calendar view with highlighted workout days, detailed session review
- **Exercise Notes** — Add notes per exercise (template-level and session-level)
- **Weight Auto-Sync** — Weight changes during a workout automatically update the sheet template
- **Authentication** — Email/password login with persistent sessions
- **Persistent Login** — Stay logged in across app restarts (SecureStore on mobile, localStorage on web)
- **Cross-Platform** — Same codebase runs on Android (APK) and Web (Vercel)
- **Per-User Data Isolation** — Row Level Security ensures you only see your own data

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native 0.76 · Expo 52 · expo-router 4 |
| Styling | NativeWind v4 (Tailwind CSS) |
| State | @tanstack/react-query v5 |
| Backend | Supabase (Auth + Postgres + RLS) |
| Build | EAS Build (Android) · Expo Web Export (Vercel) |
| Monorepo | npm workspaces |

---

## APK
the apk is aviable in this link: https://expo.dev/accounts/beccio00/projects/stravio/builds/9443dd66-7a95-44f0-869b-dca5bb408bb3

## Web App 
Web app is deployed on Vercel: https://stravio-project.vercel.app/

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- [EAS CLI](https://docs.expo.dev/eas/) (`npm install -g eas-cli`)
- A [Supabase](https://supabase.com) project

### Setup

```bash
# 1. Clone and install
git clone https://github.com/Beccio00/stravio
cd stravio
npm install

# 2. Set up Supabase
#    - Create a new Supabase project
#    - Go to SQL Editor → paste and run supabase/schema.sql
#    - Go to Authentication → Providers → Email → disable "Confirm email"

# 3. Configure Supabase credentials
#    Copy apps/mobile/.env.example to apps/mobile/.env
#    and set EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### Run Locally (Web)

```bash
npm run web -w apps/mobile
```

Open http://localhost:8081 in your browser.

### Run Locally (Device/Emulator)

```bash
npm run dev -w apps/mobile
```

### Build Android APK (v1 artifact)

```bash
eas build --platform android --profile preview
```

The APK will be saved in the current directory as `build-*.apk`.

### Build iOS Artifact

```bash
eas build --platform ios --profile production
```

Note: iOS builds require Apple credentials configured in EAS.

### Download Builds From Expo

After an EAS build finishes, artifacts are downloadable from the Expo dashboard:

1. Open your Expo project on expo.dev.
2. Go to Build and open the completed job.
3. Download artifacts:
  - Android preview profile -> APK
  - Android production profile -> AAB
  - iOS production profile -> IPA

You can also list and open build links from CLI:

```bash
eas build:list
```

### Publish Update via Expo

```bash
eas update --branch production --message "v1 release"
```

### Deploy to Vercel

```bash
# Option 1: Vercel CLI
npm install -g vercel
vercel --prod

# Option 2: Connect your GitHub repo to the Vercel Dashboard
# It will auto-detect vercel.json and build on every push
```

---

## Project Structure

```
stravio/
├── apps/
│   ├── mobile/              # Expo universal app (Android + Web)
│   │   ├── app/             # File-based routes (expo-router)
│   │   │   ├── auth/        # Login & signup screens
│   │   │   ├── sheet/       # Sheet detail screen
│   │   │   ├── workout/     # Active workout screen
│   │   │   ├── history/     # Session history + detail
│   │   │   ├── _layout.tsx  # Root layout (auth gate, providers)
│   │   │   └── index.tsx    # Home screen (sheet list)
│   │   └── src/
│   │       ├── api/         # Supabase API client + React Query hooks
│   │       ├── contexts/    # AuthContext (auth state management)
│   │       └── lib/         # Supabase client configuration
│   └── backend/             # [Deprecated] Fastify + SQLite API
├── packages/
│   ├── shared/              # TypeScript types shared across apps
│   └── react-native-worklets-stub/
├── supabase/
│   └── schema.sql           # Postgres schema (tables, RLS, triggers)
├── docs/                    # Architecture, decisions, changelog, TODO
└── vercel.json              # Vercel deployment config
```

---

## Database Schema

The Supabase Postgres database has 7 tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (role, display name) — role currently defaulted to `allievo` |
| `workout_sheets` | Workout templates owned by a user |
| `exercises` | Exercises within a sheet |
| `exercise_sets` | Template sets (reps, weight, rest time) |
| `workout_sessions` | Actual workout logs |
| `session_set_logs` | What you actually did per set |
| `session_exercise_notes` | Notes per exercise during a session |

All tables have Row Level Security (RLS) policies ensuring users only access their own data.

---

## Screenshots

Place your app screenshots in `docs/screenshots/`:

| File | Screen |
|------|--------|
| `login.png` | Login screen |
| `signup.png` | Signup screen |
| `home.png` | Home screen (sheet list) |
| `sheet.png` | Sheet detail (exercises + sets) |
| `workout.png` | Active workout session |
| `history.png` | History calendar view |
| `session.png` | Session detail review |

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design and data flow
- [Decisions](docs/DECISIONS.md) — Technical decision records
- [Changelog](docs/CHANGELOG.md) — Version history
- [TODO](docs/TODO.md) — Roadmap and task tracking
- [Release Guide](docs/RELEASE.md) — Build and publish flow for v1

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request.

Example flow:

```bash
git checkout -b feat/my-change
git add .
git commit -m "feat: my change"
git push origin feat/my-change
```

## Versioning

This project follows Semantic Versioning.

- `v1.0.0`: first stable release
- `v1.0.1`: patch fixes
- `v1.1.0`: backward-compatible features
- `v2.0.0`: breaking changes

## License

This project is licensed under GNU Affero General Public License v3.0 (AGPL-3.0).
See [LICENSE](LICENSE).
