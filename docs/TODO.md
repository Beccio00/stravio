# TODO

## High Priority

- [ ] **PowerSync integration** – Offline-first sync between local SQLite cache and Supabase Postgres. This will allow the mobile app to work offline and sync when back online.
- [x] **Deploy web app to Vercel** – Run `vercel --prod` from root or connect GitHub repo to Vercel dashboard.
- [ ] **Multi-user assignments (post-v1)** – Introduce owner/assignee relationships only with clear permission model.

## Medium Priority

- [ ] **Workout statistics** – Charts showing progress over time (weight lifted, volume, frequency).
- [ ] **Exercise library** – Pre-built exercise catalog with muscle group tags.
- [ ] **Drag-to-reorder exercises** – Within a sheet, reorder exercises by dragging.
- [ ] **Sheet templates** – Clone/duplicate an existing sheet.
- [ ] **Push notifications** – Workout reminders (Expo Notifications).
- [ ] **Profile settings screen** – Edit display name and change password.

## Low Priority

- [ ] **i18n** – Italian and English language support.
- [ ] **Data export** – Export workout history as CSV or PDF.

## Done

- [x] Initial project setup (Expo + NativeWind + monorepo)
- [x] Workout sheets CRUD
- [x] Exercises CRUD with sets
- [x] Workout sessions with real-time set logging
- [x] Session history with calendar view
- [x] Rest timer between sets
- [x] Previous session weight/rep hints
- [x] Exercise notes (template + per-session)
- [x] Supabase Auth (login/signup)
- [x] Auth gate (auto-redirect based on session)
- [x] Persistent login (SecureStore on native, localStorage on web)
- [x] Migrate from local SQLite to Supabase Postgres
- [x] Supabase RLS policies for per-user data isolation
- [x] Web build support (Expo web export)
- [x] Vercel deployment config
- [x] Project documentation (docs/)
- [x] **Custom icon and favicon** – Replaced default Expo placeholder assets with project logo (1024×1024 app icon, 64×64 web favicon).
