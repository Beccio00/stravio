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

# EAS builds
eas build --platform android --profile preview   # APK
eas build --platform ios --profile production    # IPA
eas update --branch production --message "..."   # OTA update

# TypeScript check
npx tsc --noEmit -p apps/mobile/tsconfig.json
npx tsc --noEmit -p packages/shared/tsconfig.json
```

There are no automated tests in this project.

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