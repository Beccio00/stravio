# TODO

## CURRENT

- [ ] **Fix white line** - Remove white line appearing at the bottom of the screen on Android devices.
- [ ] **Fix height of the text** 
- [ ] **Scroll horizontally** - Scroll horizontally to switch between tabs
- [ ] **Enhance settings** - Add options for rest timer, theme selection, and account management.
- [ ] **PowerSync integration** – Offline-first sync between local SQLite cache and Supabase Postgres. This will allow the mobile app to work offline and sync when back online.


## BACKLOG

### High Priority

- [ ] **Multi-user assignments (post-v1)** – Introduce owner/assignee relationships only with clear permission model.

### Medium Priority

- [ ] **Exercise library** – Pre-built exercise catalog with muscle group tags.
- [ ] **Sheet templates** – Clone/duplicate an existing sheet.
- [ ] **Settings screen** – Add a top-right settings button and allow display name/password updates, rest timer enable/disable, default rest time, and theme selection (light/dark; light theme implementation pending).
- [ ] **UI/UX polish pass** – Apply small usability and visual improvements across core daily flows.

### Low Priority

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
- [x] **Set autofill from previous set** – When creating a new set, prefill weight, reps, and rest from the previous set in that exercise.
- [x] **Deploy web app to Vercel** – Run `vercel --prod` from root or connect GitHub repo to Vercel dashboard.
- [X] **Sheet card tap target** – Make the entire sheet card tappable, not only the sheet name.
- [X] **Set autofill from previous set** – When creating a new set, prefill weight, reps, and rest from the previous set in that exercise.
- [X] **Custom splash screen, icon, and favicon** – Replace default Expo assets and use `./logo.png` (512x512) as app icon plus `./favicon.ico` for web favicon.
- [X] **Workout statistics** – Charts showing progress over time (weight lifted, volume, frequency).
- [X] **Push notifications** – Workout reminders (Expo Notifications).
- [X] **Drag-to-reorder exercises** – Within a sheet, reorder exercises by dragging.


