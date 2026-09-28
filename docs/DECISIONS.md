# Technical Decisions

Record of key technical decisions made during development.

---

## D001: Monorepo with npm workspaces

**Date**: 2026-03-09
**Status**: Active

We use npm workspaces (not Turborepo/Nx) for simplicity. The monorepo has:
- `apps/mobile` – Expo universal app
- `apps/backend` – Fastify API (now deprecated, kept for reference)
- `packages/shared` – Shared TypeScript types
- `packages/react-native-worklets-stub` – NativeWind compat shim

---

## D002: NativeWind v4 for styling

**Date**: 2026-03-09
**Status**: Active

NativeWind lets us use Tailwind CSS classes in React Native. Requires:
- `nativewind/babel` preset in babel config
- `nativewind/metro` wrapper in metro config
- `react-native-worklets-stub` no-op plugin (RN 0.76.6 compat)
- `nativewind-env.d.ts` for TypeScript className support

---

## D003: Supabase instead of custom backend

**Date**: 2026-03-10
**Status**: Active

**Context**: The app needs auth, cloud database, and per-user data isolation.

**Decision**: Use Supabase (Auth + Postgres + RLS) instead of self-hosted Fastify + SQLite.

**Pros**:
- No server to maintain
- Built-in auth with multiple providers
- RLS policies for security without backend code
- Real-time subscriptions available for future use
- Free tier sufficient for early development

**Cons**:
- Vendor lock-in (mitigated: standard Postgres, can self-host Supabase)
- No offline support without additional tooling (future: PowerSync)
- Latency for every operation (no local cache currently)

---

## D004: Expo universal app (no separate web framework)

**Date**: 2026-03-10
**Status**: Active

**Context**: Need both mobile (Android APK) and web app.

**Decision**: Use Expo's built-in web support (`expo export --platform web`) instead of a separate Next.js/Vite app.

**Pros**:
- Single codebase for mobile + web
- No UI code duplication
- React Native Web handles component mapping
- Simple static deploy to Vercel

**Cons**:
- Web bundle is larger than a native web app would be (~1.3 MB JS)
- Some React Native components may not map perfectly to web
- SEO not important for this app (SPA is fine)

---

## D005: UUID primary keys everywhere

**Date**: 2026-03-10
**Status**: Active

**Context**: Supabase uses UUID PKs by default. Local SQLite used auto-increment integers.

**Decision**: Switch all TypeScript interfaces to `string` IDs (UUID). Drop local SQLite as primary data store.

**Trade-offs**:
- Route params no longer need `parseInt()`
- `apps/backend/` code has type mismatches (deprecated, not a concern)
- UUIDs are longer but globally unique (important for eventual sync)

---

## D006: EAS builds from monorepo root

**Date**: 2026-03-10
**Status**: Active (build workaround)

**Context**: EAS always runs from the npm workspace root, not from `apps/mobile/`.

**Decision**: Create root-level configs + symlinks so EAS can find everything:
- Root `app.json` with full Expo config (asset paths adjusted to `./apps/mobile/assets/`)
- Root `metro.config.js` and `babel.config.js`
- Root `eas.json` for build profiles
- Symlinks: `app → apps/mobile/app`, `src → apps/mobile/src`, etc.

**Note**: The `app` symlink at root (pointing to `apps/mobile/app`) exists for this reason. It is NOT a source folder — `apps/` contains the actual code.

---

## D007: Keep APK files in repo

**Date**: 2026-03-10
**Status**: Active

APK files are kept in `apps/mobile/` as version snapshots:
- `build-*.apk` files serve as historical versions
- `.gitignore` excludes them from git (they're too large)
- Useful for quick testing without rebuilding

---

## D008: Role kept in schema, hidden in v1 UX

**Date**: 2026-03-10
**Status**: Active

**Current v1 behavior**:
- Signup always writes `allievo` in user metadata.
- `profiles.role` is still stored in Postgres with CHECK constraint compatibility.
- The UI does not show or let users choose roles.

Role is kept in schema to avoid breaking existing data and to support future multi-role features.

---

## D009: notifee for the background rest timer

**Date**: 2026-09-25
**Status**: Active

**Context**: The rest timer stored the remaining seconds in React state and decremented them from a re-armed `setTimeout`. React Native suspends JS timers while the Android activity is backgrounded, so leaving the app froze the countdown and it resumed from where it stopped (issue #32). Deriving the display from a wall-clock deadline fixes the arithmetic, but the user also wants to see the countdown while the app is away — and that requires the *system* to draw it, because no JS is running.

`expo-notifications` cannot do this. Android renders a live countdown when a notification sets `setUsesChronometer` + `setChronometerCountDown` with a future `when` timestamp, and expo-notifications exposes none of those three on its Android content API. The only alternative would be to repost the notification from JS every second, which is exactly the thing that stops working in the background.

**Decision**: Add `@notifee/react-native`, pinned to exactly `9.1.8`, and keep every notifee call inside `apps/mobile/src/lib/restNotifications.ts`. Rest starts post one ongoing notification with `showChronometer` / `chronometerDirection: "down"` / `timestamp` / `timeoutAfter`, on a LOW-importance channel so it is silent and never a heads-up banner; the system draws the digits and removes the notification by itself at zero. The bell is a separate `createTriggerNotification` with a `TimestampTrigger` and `AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE`, on a DEFAULT-importance channel whose sound is `bell` (`apps/mobile/assets/bell.wav`, generated by `scripts/make-bell.py`). `src/lib/restTimer.ts` holds the pure deadline logic, with no native import, and `restNotifications.web.ts` is a no-op sibling so Metro keeps notifee out of the web bundle.

**Pros**:
- The countdown is correct after any amount of background time, and stays correct even if the app is killed — nothing has to be running.
- Silent by construction: LOW importance means no sound, no vibration, no banner.
- No config plugin and no `expo-build-properties` change: notifee autolinks through its own `react-native.config.js`, and its `android/build.gradle` injects its local maven repo into `rootProject.allprojects`.
- Blast radius is one file; web and Expo Go fall back to the on-screen card, which is already correct because it is derived from the clock.

**Cons**:
- A native dependency: the rest timer cannot be tested in Expo Go, and shipping it needs `eas build`, not an OTA update.
- Upstream `invertase/notifee` is archived; `9.1.8` (2024-12-20) is the last release, hence the exact pin. It is RN 0.76-era code and will have to be revisited before `newArchEnabled: true` (tracked in `docs/TODO.md`).
- `npx expo-doctor` reports `Unmaintained: @notifee/react-native` in the React Native Directory check. That check is otherwise useful, so notifee is listed in `expo.doctor.reactNativeDirectoryCheck.exclude` rather than letting the doctor job fail on every future pull request; the archived dependency stays visible in `docs/TODO.md` instead.
- Android channel importance and sound are immutable once created on a device, so the channel ids carry a `-v1` suffix that must be bumped to change either.

---

## Future Decisions (TODO)

- **PowerSync**: Offline-first sync between local SQLite and Supabase
- **Multi-role model**: Re-introduce role-specific flows only when assignment and permissions are fully designed
- **Transactional import**: Move `api.sheets.import` into a Postgres RPC so a partial import rolls back in the database instead of being undone from the client
- **Workout history export**: CSV/PDF export of *sessions*. Sheet export shipped in v1.2.0 (`src/lib/sheetsIO.ts`); history is still unexported.
