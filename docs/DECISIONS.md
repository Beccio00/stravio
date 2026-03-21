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

## Future Decisions (TODO)

- **PowerSync**: Offline-first sync between local SQLite and Supabase
- **Multi-role model**: Re-introduce role-specific flows only when assignment and permissions are fully designed
- **Push notifications**: Workout reminders via Expo notifications
- **Data export**: CSV/PDF export of workout history
