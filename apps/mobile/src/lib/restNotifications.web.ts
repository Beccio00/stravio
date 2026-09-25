// Web stub for `restNotifications.ts`.
//
// Its only job is to exist: with this sibling in place Metro resolves
// `./restNotifications` to this file for the web bundle, so the literal
// `require("@notifee/react-native")` in the native version never enters the web
// dependency graph. (A dynamic require with a literal string is statically
// resolvable, so without this file Metro would bundle notifee for web even
// though nothing there could ever call it.)
//
// The web rest timer is the on-screen card alone, which is already correct
// because it is derived from the wall clock.

export interface RestNotificationOptions {
  /** Wall-clock instant, in ms, at which the rest ends. */
  endsAt: number;
  exerciseName: string;
  setNumber: number;
}

export async function showRestNotification(_opts: RestNotificationOptions): Promise<void> {
  // No-op on web.
}

export async function cancelRestNotifications(): Promise<void> {
  // No-op on web.
}
