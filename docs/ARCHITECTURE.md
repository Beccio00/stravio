# Architecture

## Overview

Stravio is a gym workout tracker with a **universal app** (mobile + web) and a **Supabase** backend.

```
┌───────────────────────────────────────────────┐
│               Expo Universal App              │
│  (React Native + expo-router + NativeWind)    │
│                                               │
│   Mobile (Android APK)  │  Web (Vercel SPA)   │
│          ↓              │        ↓            │
│   Same codebase, same screens, same hooks     │
└────────────────┬──────────────────────────────┘
                 │ Supabase JS client
                 ↓
┌───────────────────────────────────────────────┐
│              Supabase (cloud)                 │
│                                               │
│  Auth  │  Postgres  │  RLS policies           │
│        │  (7 tables)│  (per-user isolation)   │
└───────────────────────────────────────────────┘
```

## Monorepo Structure

```
bhmt3wp/
├── apps/
│   ├── mobile/          # Expo universal app (Android + Web)
│   │   ├── app/         # expo-router screens
│   │   ├── src/         # API client, hooks, auth context, supabase config
│   │   └── ...
│   └── backend/         # [DEPRECATED] Fastify + SQLite (replaced by Supabase)
├── packages/
│   ├── shared/          # TypeScript types shared across all apps
│   └── react-native-worklets-stub/  # NativeWind compatibility shim
├── supabase/
│   └── schema.sql       # Postgres schema with RLS policies
├── docs/                # Project documentation
├── vercel.json          # Vercel deployment config
└── [root configs]       # EAS build configs, metro, babel, tailwind (symlinks)
```

## Key Design Decisions

### 1. Supabase as sole backend
- **Before**: Mobile used local SQLite (expo-sqlite + drizzle-orm), web used Fastify HTTP API
- **After**: Both mobile and web use Supabase JS client directly
- **Why**: Data needs to sync to the cloud for multi-device access and web app support. RLS policies handle per-user data isolation without a custom backend.

### 2. Expo Universal (not separate web app)
- The same Expo codebase serves both Android APK and web SPA
- `expo export --platform web` produces static files deployed to Vercel
- No separate Next.js app needed — React Native components render to web via react-native-web

### 3. UUID primary keys
- Supabase uses UUIDs for all table IDs (not auto-increment integers)
- TypeScript interfaces use `string` for all ID fields
- Route params from expo-router are used directly (no parseInt)

### 4. Supabase Auth with roles
- Two roles: `coach` and `allievo` (athlete)
- Role stored in `profiles.role` with a CHECK constraint
- Profile auto-created via Postgres trigger on `auth.users` insert
- Session persisted with `expo-secure-store` (native) or `localStorage` (web)

### 5. Row Level Security (RLS)
- Every table has RLS enabled
- Users can only CRUD their own data
- Child tables (exercises, sets, logs) use `EXISTS` subqueries to verify ownership through parent

## Data Flow

```
User action (tap "Create Sheet")
  → React Query mutation (useCreateSheet)
    → api.sheets.create() in client.ts
      → supabase.from("workout_sheets").insert({...})
        → Supabase Postgres (RLS checks user_id)
          → Returns new row
    → React Query invalidates ["sheets"] cache
      → UI re-renders with new data
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React Native 0.76.6 + Expo ~52 |
| Routing | expo-router ~4 (file-based) |
| Styling | NativeWind v4 (Tailwind CSS for RN) |
| State / Cache | @tanstack/react-query v5 |
| Backend | Supabase (Auth + Postgres + RLS) |
| Auth Storage | expo-secure-store (native) / localStorage (web) |
| Build | EAS Build (Android APK) / Expo Web Export (Vercel) |
| Types | TypeScript 5.7+ with shared package |
| Monorepo | npm workspaces |
