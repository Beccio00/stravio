// Pure rest-timer logic: a deadline, not a countdown.
//
// The bug this replaces (#32) stored the remaining seconds in state and
// decremented them from a re-armed `setTimeout`. React Native suspends JS
// timers while the Android activity is backgrounded, so the counter froze and
// resumed where it stopped. Here the only stored value is the wall-clock
// instant the rest ends; everything on screen is derived from `Date.now()`, so
// the display is correct by construction however long the JS thread was idle.
//
// This module is deliberately free of any native import so it works
// identically on web, in Expo Go and in the APK.

/** Refresh cadence for the on-screen value. Correctness never depends on it
 *  firing: it only decides how quickly the display catches up after a resume. */
export const REST_TICK_MS = 250;

/** Whole seconds still to wait, never negative. */
export function restSecondsLeft(endsAt: number | null, now: number = Date.now()): number {
  if (endsAt === null) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** True while the deadline is still in the future. */
export function isRestActive(endsAt: number | null, now: number = Date.now()): boolean {
  return endsAt !== null && endsAt > now;
}

/** `m:ss`, the format the rest card has always shown. */
export function formatRest(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
