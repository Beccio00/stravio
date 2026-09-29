# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (run from repo root)
npm install

# Start the app (Expo dev server — mobile + web)
npm run dev                          # or: npm run dev:mobile
npm run web -w apps/mobile           # web only at http://localhost:8081

# Run on device/emulator
npm run dev -w apps/mobile           # Expo Go / dev client
npm run android -w apps/mobile       # direct Android build
npm run ios -w apps/mobile           # direct iOS build

# EAS builds (run from apps/mobile)
eas build --platform android --profile preview       # installable APK
eas build --platform android --profile production    # AAB for Play
eas build --platform android --profile development   # dev client, for native work
# eas update — NOT available yet: expo-updates is not installed and there is no
# runtimeVersion in app.json. See "EAS Update (OTA) setup" in docs/TODO.md.

# TypeScript check
npx tsc --noEmit -p apps/mobile/tsconfig.json
npx tsc --noEmit -p packages/shared/tsconfig.json
```

There are no automated tests in this project. CI on every pull request runs the two type-checks, `expo-doctor` and a web export.

## Native dependencies

Some features do not exist in Expo Go and cannot be verified with `npm run dev`. They need `eas build --profile development` (dev client) or `--profile preview` (APK):

- **`@notifee/react-native`** — the ongoing rest-timer notification and its bell (see D009). Pinned to `9.1.8`; upstream is archived. It has **no Expo config plugin**, despite what its own docs say: adding it to `app.json` → `plugins` makes `expo prebuild` fail. Autolinking is enough.

Expo Go also always runs the New Architecture while `app.json` has `newArchEnabled: false`, so the APK and Expo Go can genuinely behave differently. Smoke-test native changes on the APK.

## UI conventions

Two rules the code enforces but never states:

1. **Theming happens through token classes.** Use `bg-surface`, `text-text-muted`, `border-border` and so on; there are no `dark:` variants anywhere. Only call `usePreferences().resolvedTheme` when a prop needs a literal colour value instead of a class, such as a Lucide `color`.
2. **On the Home sheet card, a new tap target must be a _sibling_ of the title touchable**, never nested inside it — `stopPropagation` does not stop gesture-handler touchables. The comment at `apps/mobile/app/(tabs)/index.tsx` above `renderSheet` is the only other place this is recorded.

## Documentation

Use `./docs/*` as the canonical source for product/project documentation. Keep this file concise and avoid duplicating long-form content that already exists there.

- `docs/ARCHITECTURE.md` — detailed architecture and data flow
- `docs/CHANGELOG.md` — release-by-release change history
- `docs/DECISIONS.md` — major technical/product decisions and rationale
- `docs/RELEASE.md` — release process and checklist
- `docs/TODO.md` — prioritized roadmap and open tasks

## Environment Setup

Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `EXPO_PUBLIC_SUPABASE_ANON_KEY`)

In Supabase: run `supabase/schema.sql` in the SQL Editor, then disable "Confirm email" under Authentication → Providers → Email.