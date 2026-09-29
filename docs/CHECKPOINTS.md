# Checkpoints

Short-lived working notes: what is in flight right now, and the context that is
not recoverable from the code or the git history. Delete a section once its work
has shipped.

## Shipped — v1.3.0 (2026-09-29)

Selection and search on Home (#51), import/export progress (#52), the background
rest timer (#53) and a documentation refresh (#54). All four were checked on web,
in Expo Go and on a preview APK built from the merged `dev`, then released
together.

Two paths were never exercised and are worth a look the next time someone is in
there: the import rollback (it needs the network to drop part-way through a
write) and the web file-picker cancel fix in Safari specifically, where support
for the `cancel` event is newest.

## Decisions that are easy to get wrong later

- **notifee has no Expo config plugin**, even though its own installation docs
  say to add it to `app.json` → `plugins`. The published tarball has no
  `app.plugin.js`; adding the entry makes `expo prebuild` fail. Autolinking via
  its bundled `react-native.config.js` is all it needs.
- **`import notifee` throws at module-evaluation time**, not when you call it,
  so it can never be imported at the top level of a file that web or Expo Go
  will load. That is why `restNotifications.ts` has a `.web.ts` sibling and does
  the `require` behind a guard.
- **Android notification channels are immutable** once created on a device:
  importance and sound cannot be changed afterwards. The ids carry a `-v1`
  suffix; bump it, never the visible name.
- **`api.sheets.reorder` rewrites `order_index` for exactly the ids it is
  given.** Handing it a filtered subset silently reindexes the whole list, which
  is why drag is disabled on the Home screen while searching or selecting.
- **Progress bars are driven by round-trips, not bytes.** The byte count is a
  label. See the import/export section in `ARCHITECTURE.md` for the numbers.

## Known rough edges, deliberately left

- Selecting sheets on Home and *then* typing a search still deletes the
  selected-but-hidden ones. The confirmation names them, so it is visible rather
  than silent.
- Discarding a workout from the Home banner while a rest is running leaves the
  ongoing notification up until its own deadline (at most a few minutes —
  `timeoutAfter` clears it).
- The import is not transactional. The client deletes what it wrote when a write
  fails, but a dropped connection can defeat the cleanup too. The real fix is a
  Postgres RPC; it is in `TODO.md`.
