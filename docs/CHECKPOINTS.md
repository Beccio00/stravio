# Checkpoints

Short-lived working notes: what is in flight right now, and the context that is
not recoverable from the code or the git history. Delete a section once its work
has shipped.

## In flight — v1.3.0

Four branches off `dev`, all independent, each with its own pull request. None of
them bumps the version: the bump to `1.3.0` happens in a separate release PR once
all four are merged and tested.

| Branch | PR | Verified on |
|---|---|---|
| `feat/home-select-and-search` | #51 | web `:8081`, Expo Go |
| `feat/io-progress` | #52 | web `:8081`, Expo Go |
| `fix/background-timer` | #53 | **preview APK only** — notifee is absent from Expo Go |
| `docs/refresh` | #54 | n/a |

### What still needs a human with a device

`fix/background-timer` is the only branch whose behaviour cannot be observed
without `eas build --platform android --profile preview`. Nobody has yet seen:
the chronometer counting down on the lock screen, `timeoutAfter` removing the
ongoing notification at zero, the bell firing on time under Doze, or the LOW
channel producing no banner and no vibration.

Two smaller things were also never exercised at runtime: the web file-picker
cancel fix in `feat/io-progress` (event ordering between `cancel` and `focus`
varies by browser — open the picker and press Escape) and the import rollback,
which needs the network to drop part-way through a write.

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
