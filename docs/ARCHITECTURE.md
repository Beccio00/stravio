## Architecture

### Monorepo Layout

```
apps/mobile/          ← Expo universal app (Android APK + Vercel web SPA)
  app/                ← expo-router file-based screens
  assets/             ← icons, splash, notification icon, bell.wav
  src/api/            ← Supabase API client (client.ts) + React Query hooks (hooks.ts)
  src/components/ui/  ← shared primitives (Button, Card, Input, ProgressBar, …)
  src/contexts/       ← AuthContext (session), PreferencesContext (theme)
  src/lib/            ← platform-facing modules, one concern each (see below)
apps/backend/         ← DEPRECATED Fastify + SQLite API, kept for reference only
packages/shared/      ← TypeScript types shared across the monorepo
packages/react-native-worklets-stub/  ← no-op shim for NativeWind + RN 0.76 compat
supabase/             ← Postgres schema + RLS migrations
```

> The only thing at the repo root pointing into the app is the `app → apps/mobile/app` symlink, and it appears vestigial: EAS Build runs with `working-directory: apps/mobile` (`.github/workflows/eas-production.yml`) and `eas.json` lives in `apps/mobile/`. There is no root `app.json`, `src/`, `metro.config.js` or `babel.config.js`. The real source is `apps/mobile/`.

#### `src/lib/`

| File | What it owns |
|---|---|
| `supabase.ts` | Supabase client, with platform-aware auth storage |
| `preferences.ts` | Rest-timer and theme preferences (SecureStore on native, localStorage on web) |
| `notifications.ts` | `expo-notifications`: the daily reminder, the foreground handler, Android channels |
| `restTimer.ts` | Pure rest-timer arithmetic — a deadline, no native import |
| `restNotifications.ts` / `.web.ts` | The only module that touches `@notifee/react-native` |
| `sessionCache.ts` | In-progress workout state in AsyncStorage |
| `queryPersister.ts` | React Query cache persistence |
| `sheetsIO.ts` | Sheet import/export: JSON, CSV, PDF |
| `ioProgress.ts` | Shared progress model for import/export |
| `confirm.ts` | One cross-platform `confirm()` / `notify()` |

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

NativeWind v4 — Tailwind CSS classes on React Native components. The design tokens in `tailwind.config.js` mostly resolve to CSS variables, defined twice: in `global.css` (`:root` for dark, `.light` for light) for web, and as `vars()` objects in `app/_layout.tsx` for native. The action roles (`action-primary`, `emphasis`, `danger`) are literal hex and stay the same in both themes.

The rule the code follows: **use the token classes** (`bg-surface`, `text-text-muted`, `border-border`) and theming happens on its own — there are no `dark:` variants anywhere. Reach for `usePreferences().resolvedTheme` only when a prop needs a literal colour value rather than a class, such as a Lucide `color` or `placeholderTextColor`.

### Shared Types

All TypeScript interfaces live in `packages/shared/src/index.ts` and are imported as `@bhmt3wp/shared`. When adding new API shapes, update this file first.

### `api.sheets.create` ordering note

New sheets are inserted with `order_index` = (current minimum − 1) so they appear at the top of the list. `api.sheets.reorder` writes sequential indices 0, 1, 2… after a drag-and-drop.

### Sheet import / export

`src/lib/sheetsIO.ts` reads and writes the whole file as a single in-memory string: nothing is streamed or chunked, on either platform. That is fine because the payloads are small — a typical sheet is 5–7 KB of JSON, a heavy full export 150–200 KB — and parsing is sub-second even at a megabyte. Imports are capped at `MAX_IMPORT_BYTES` (8 MB), checked before the file is read.

The time goes into round-trips, not bytes. `api.sheets.import` writes `2 + S + 2E` requests **sequentially** (one insert per sheet and one per exercise, each needing `.select().single()` for the id; sets are array-batched per exercise), so 20 sheets with 200 exercises is around 400 requests. Export is round-trip bound too: one `api.sheets.get` per sheet, each `1 + 1 + N` queries. This is why the progress bar is driven by work units and shows the byte count only as a label.

None of it is transactional — every insert autocommits — so `import` tracks the sheets it created and deletes them on failure. That is a client-side undo, not a rollback: see the TODO entry on moving the import into a Postgres RPC.

### Rest timer

The countdown is a wall-clock deadline (`restEndsAt`), never a decrementing counter, because React Native suspends JS timers while the Android activity is backgrounded. Everything on screen derives from `Date.now()`, so the value is right however long the JS thread was idle; an `AppState` listener recomputes it the instant the app comes back.

On Android the deadline is also handed to the system: `restNotifications.ts` posts one ongoing notification with `showChronometer` and a future `timestamp`, so Android draws the countdown with no JS running and removes it at zero via `timeoutAfter`. The end-of-rest bell is a separate exact-alarm trigger. See D009.
