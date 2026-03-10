# Stravio 🏋️

A gym workout tracker for athletes and coaches. Build workout sheets, log sessions in real-time, and track your progress — on Android and Web.

<p align="center">
  <img src="docs/screenshots/login.png" width="200" alt="Login" />
  <img src="docs/screenshots/home.png" width="200" alt="Home" />
  <img src="docs/screenshots/sheet.png" width="200" alt="Sheet Detail" />
  <img src="docs/screenshots/workout.png" width="200" alt="Workout" />
</p>

> **Screenshots**: Place your screenshots in `docs/screenshots/` with the names referenced above.

---

## Features

- **Workout Sheets** — Create and manage custom workout templates with exercises and sets
- **Real-Time Session Logging** — Start a workout from any sheet, log each set with actual weight and reps
- **Rest Timer** — Automatic countdown between sets with skip option
- **Previous Session Hints** — See what you did last time for each exercise during your workout
- **Session History** — Calendar view with highlighted workout days, detailed session review
- **Exercise Notes** — Add notes per exercise (template-level and session-level)
- **Weight Auto-Sync** — Weight changes during a workout automatically update the sheet template
- **Authentication** — Email/password login with two roles: Athlete and Coach
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

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- [EAS CLI](https://docs.expo.dev/eas/) (`npm install -g eas-cli`)
- A [Supabase](https://supabase.com) project

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd bhmt3wp
npm install

# 2. Set up Supabase
#    - Create a new Supabase project
#    - Go to SQL Editor → paste and run supabase/schema.sql
#    - Go to Authentication → Providers → Email → disable "Confirm email"

# 3. Configure Supabase credentials
#    Edit apps/mobile/src/lib/supabase.ts with your project URL and anon key
```

### Run Locally (Web)

```bash
cd apps/mobile
npx expo start --web
```

Open http://localhost:8081 in your browser.

### Build Android APK

```bash
cd apps/mobile
eas build --platform android --profile preview --local
```

The APK will be saved in the current directory as `build-*.apk`.

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
bhmt3wp/
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
| `profiles` | User profiles (role, display name) — auto-created on signup |
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
| `signup.png` | Signup with role selector |
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

---

## License

Private project.
    └────────┘    └──────────┘