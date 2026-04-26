## Architecture

### Monorepo Layout

```
apps/mobile/          ← Expo universal app (Android APK + Vercel web SPA)
  app/                ← expo-router file-based screens
  src/api/            ← Supabase API client (client.ts) + React Query hooks (hooks.ts)
  src/contexts/       ← AuthContext (session state, profile)
  src/lib/            ← Supabase client init (platform-aware storage)
apps/backend/         ← DEPRECATED Fastify + SQLite API, kept for reference only
packages/shared/      ← TypeScript types shared across the monorepo
packages/react-native-worklets-stub/  ← no-op shim for NativeWind + RN 0.76 compat
supabase/             ← Postgres schema + RLS migrations
```

> **Root-level `app/`, `src/`, `metro.config.js`, `babel.config.js`, `app.json`** are symlinks or copies pointing into `apps/mobile/`. They exist solely because EAS Build runs from the monorepo root. The real source lives in `apps/mobile/`.

### Data Flow

All data operations go through `apps/mobile/src/api/`:
1. Screen calls a React Query hook from `hooks.ts`
2. Hook calls an `api.*` function from `client.ts`
3. `client.ts` calls the Supabase JS client directly (no custom HTTP API)
4. Supabase enforces RLS — every query is automatically scoped to the authenticated user
5. On success, the mutation invalidates the relevant React Query cache keys

### Auth

`AuthContext` (`src/contexts/AuthContext.tsx`) wraps the app and exposes `session`, `user`, `profile`, `signIn`, `signUp`, `signOut`. The root layout (`app/_layout.tsx`) contains `AuthGate` which redirects unauthenticated users to `/auth/login` and authenticated users away from the auth group.

Session persistence is handled by the Supabase client itself: `expo-secure-store` on native, `localStorage` on web (see `src/lib/supabase.ts`).

### Database (Supabase Postgres)

7 tables, all with RLS. Child ownership is verified through parent via `EXISTS` subqueries:

| Table | Role |
|---|---|
| `profiles` | User display name and role (always `allievo` in v1) |
| `workout_sheets` | Workout templates owned by a user |
| `exercises` | Exercises within a sheet, ordered by `order_index` |
| `exercise_sets` | Template sets (reps, weight, rest) |
| `workout_sessions` | Actual workout logs; `completed_at` is null while in progress |
| `session_set_logs` | What the user actually did per set |
| `session_exercise_notes` | Notes per exercise during a session |

All IDs are UUIDs (`string` in TypeScript). Route params from expo-router are used directly — no `parseInt`.

Profile rows are auto-created via a Postgres trigger on `auth.users` insert.

### Styling

NativeWind v4 — Tailwind CSS classes on React Native components. Custom design tokens are defined in `tailwind.config.js` (dark palette: `background`, `surface`, `primary`, `accent`, `danger`, `text-primary`, etc.). Use these semantic tokens rather than raw hex values.

### Shared Types

All TypeScript interfaces live in `packages/shared/src/index.ts` and are imported as `@bhmt3wp/shared`. When adding new API shapes, update this file first.

### `api.sheets.create` ordering note

New sheets are inserted with `order_index` = (current minimum − 1) so they appear at the top of the list. `api.sheets.reorder` writes sequential indices 0, 1, 2… after a drag-and-drop.
