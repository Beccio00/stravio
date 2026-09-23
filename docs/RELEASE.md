# Release Guide

## Scope

The operational release flow for Stravio: work lands on `dev`, is tested
locally and on a real device, and only then reaches `main` and production.

Nothing deploys by itself. `vercel.json` sets `git.deploymentEnabled: false`
because the GitHub integration builds without the Supabase environment
variables and ships a broken bundle; production is published manually from a
machine that has `apps/mobile/.env`.

## Prerequisites

- `eas-cli` authenticated on the account that owns the `stravio` project.
- `vercel` CLI logged in and the repo linked (`vercel link`).
- `apps/mobile/.env` filled in (see `.env.example`).
- Clean git working tree.

## 1. Pre-release checks

From the repository root, on `dev`:

```bash
npm install
npx tsc --noEmit -p apps/mobile/tsconfig.json
npx tsc --noEmit -p packages/shared/tsconfig.json
cd apps/mobile && npx -y expo-doctor   # must report all checks passing
```

Then exercise the app, web and device:

```bash
npm run web -w apps/mobile   # browser, http://localhost:8081
npm run dev -w apps/mobile   # phone, via Expo Go
```

- Sign up / sign in, sheets list scrolls and reorders.
- Sheet: rename, duplicate, delete, add exercises and sets.
- Workout: Done/Undo, rest timer, notes, Finish; resume from the Home banner.
- History: move between months; Stats render.
- Settings: theme, rest timer, export/import, Sign out.

Expo Go is not enough on its own: it always runs the New Architecture and
ships its own native modules, so anything touching `app.json` or a native
dependency must be verified on an APK (see step 3).

## 2. Bump the version

Set `expo.version` in `apps/mobile/app.json` to the release version; it is what
the Settings footer shows and what EAS stamps on the artifacts. The Android
`versionCode` is managed by EAS (`appVersionSource: remote`) and auto-increments
on the `production` profile only.

Update `docs/CHANGELOG.md` with the new section.

## 3. Build artifacts

```bash
cd apps/mobile
eas build --platform android --profile preview      # APK, installable directly
eas build --platform android --profile production   # AAB, only for Google Play
```

The APK link goes in the README. The AAB is not installable on a phone; it is
only useful when publishing to Play (which also needs a developer account, a
store listing and `eas submit`).

iOS builds need Apple credentials configured in EAS:

```bash
eas build --platform ios --profile production
```

## 4. Web release (Vercel)

From `main`, on a machine with `apps/mobile/.env`:

```bash
npx vercel --prod
```

Preview deployments for a branch use `npx vercel` (no `--prod`); they are
login-protected.

OTA updates (`eas update`) are **not** configured yet: `expo-updates` and
`runtimeVersion` are missing from the app config. See `docs/TODO.md`.

## 5. Versioning and changelog

Release naming (recommended):
- First stable release: `v1.0.0`
- Hotfixes: `v1.0.1`, `v1.0.2`, ...
- Minor features: `v1.1.0`, `v1.2.0`, ...
- Breaking changes: `v2.0.0`, ...

- Update `docs/CHANGELOG.md` with release date and final notes.
- Merge release work to `main` and push:

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff dev -m "release: v1.2.0"
git push origin main
```

- Create an annotated tag matching `expo.version`:

```bash
git tag -a v1.2.0 -m "Stravio v1.2.0"
git push origin v1.2.0
```

## 6. Post-release smoke checks

- Install the APK: it opens, login works, a full workout can be logged.
- Open https://stravio-project.vercel.app: routing, auth, and the Settings
  footer showing the released version.
- `eas build:list` shows the expected `appVersion` on both artifacts.
- Confirm Supabase inserts remain scoped by RLS.

## 7. Rollback strategy

- Web: `vercel ls --prod`, then promote the previous deployment
  (`vercel promote <url>`), or redeploy the previous tag.
- Binary: share the APK of the previous build from the EAS dashboard.
- OTA would be the fastest path, but it is not configured yet.
