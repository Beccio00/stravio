# TODO

## CURRENT

- [ ] **PowerSync integration** – Offline-first sync between local cache and Supabase Postgres. This has to allow the mobile app to work offline and sync when back online, and should be much more quick by loading data from the local cache. Use SQLite if it works well with both Expo, Vercel and Android, otherwise consider alternatives
- [ ] **Fix Notifications on Android** – Debug and resolve issues with Expo Notifications not working on Android devices, ensuring users receive workout reminders as intended and the doesn't glitch showing the white screen (compatibility problem).
- [ ] **Store current session in local cache** – This allows users to resume an active workout session even if they go on other tabs, close the app, or lose connectivity, improving the user experience during workouts.
- [ ] **Fix notes** - The notes are not working properly, they are not saved and not shown in the sessions history. This needs to be fixed to ensure users can take notes on their exercises and review them later.
- [ ] **Sheet templates** – Clone/duplicate an existing sheet.
- [ ] **Supabase session too large for SecureStore** – The persisted auth session exceeds SecureStore's 2048-byte limit on Android (warning today, error in a future SDK → persistent login at risk in the APK). Move the Supabase auth storage to AsyncStorage (or the LargeSecureStore pattern from the Supabase docs).
- [ ] **EAS Update (OTA) setup** – Install `expo-updates`, set `runtimeVersion` (`appVersion` policy) and `updates.url` in `app.json`, rebuild the APK, then enable the `update` job in `.github/workflows/eas-production.yml`. Also lets testers open a preview from expo.dev → Updates in Expo Go.
- [ ] **New Architecture** – Expo Go always runs the New Architecture while `app.json` has `newArchEnabled: false` (APK = old arch). This is why Expo Go and the APK can behave differently; always smoke-test on the APK. Evaluate switching to `newArchEnabled: true` once `react-native-draggable-flatlist`/reanimated warnings are sorted out.
- [ ] **Draggable list warnings** – `react-native-draggable-flatlist` logs "GestureDetector has received a child that may get view-flattened" and Reanimated "Tried to modify key `current`" under the New Architecture (Expo Go). Harmless for now; wrap row content in `<View collapsable={false}>` or upgrade the library.
- [ ] **Web console warning** – `findDOMNode is deprecated` from react-native-web in `(tabs)/_layout.tsx` on web. Cosmetic.


## BACKLOG

### High Priority

- [ ] **Multi-user assignments (post-v1)** – Introduce owner/assignee relationships only with clear permission model.

### Medium Priority

- [ ] **Exercise library** – Pre-built exercise catalog with muscle group tags.
- [ ] **UI/UX polish pass** – Apply small usability and visual improvements across core daily flows.

### Low Priority

- [ ] **i18n** – Italian and English language support.
- [ ] **Data export** – Export workout history as CSV or PDF.


## Done

- [x] **UI polish on sheet** – Rename button with pencil icon (restored from main's sheet screen).
- [x] **Reset query cache on login/logout** – Persisted React Query cache no longer shows stale/other-user data after a fresh login.

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
- [X] **Enhance settings** - Add options for rest timer, theme selection, and account management.
- [X] **Light Theme** – Real light theme alongside dark and system. CSS variables drive Tailwind tokens; PreferencesContext exposes a resolved theme; settings screen offers Dark / Light / System.
- [X] **Local query cache** – Persist react-query cache to AsyncStorage so the app loads instantly from cache on cold start and refetches in the background. (Lighter alternative to PowerSync; full offline-first sync remains future work.)
