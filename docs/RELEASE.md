# Release Guide

## Scope

This document defines the operational release flow for Stravio v1.

v1 goals:
- Unified UX without role selection.
- Signup always stored as `allievo` in DB metadata.
- Open source distribution under AGPL-3.0.
- Deliverable artifacts: Android build, iOS build, web deployment.

## Prerequisites

- EAS CLI installed and authenticated.
- Apple developer credentials configured for iOS builds.
- Supabase production project configured in app config.
- Clean git working tree for tagged releases.

## 1. Pre-release checks

From repository root:

```bash
npm install
npm run web -w apps/mobile
```

Then verify manually:
- Signup works and creates user.
- No role selection in signup UI.
- No profile icon/name block in home header.
- Sheet CRUD and workout session flow still work.

## 2. Build artifacts

### Android (APK preview)

```bash
eas build --platform android --profile preview
```

### Android (store-ready, if configured)

```bash
eas build --platform android --profile production
```

### iOS

```bash
eas build --platform ios --profile production
```

## 3. OTA update publish

Use this when app binaries are already installed and only JS/assets changed.

```bash
eas update --branch production --message "v1 release"
```

## 4. Web release (Vercel)

```bash
vercel --prod
```

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
git merge --no-ff dev -m "release: v1.0.0"
git push origin main
```

- Create annotated git tag, for example:

```bash
git tag -a v1.0.0 -m "Stravio v1"
git push origin v1.0.0
```

## 6. Post-release smoke checks

- Install Android artifact and run login + core workout flow.
- Install iOS artifact and run login + core workout flow.
- Open web deployment and verify routing and auth.
- Confirm Supabase inserts remain scoped by RLS.

## 7. Rollback strategy

- Web: redeploy previous Vercel deployment.
- OTA: publish a corrective EAS update on the same branch.
- Binary: re-promote previous stable build from EAS history.
