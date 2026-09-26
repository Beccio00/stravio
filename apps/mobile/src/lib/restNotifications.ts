// The only module in the app that touches @notifee/react-native.
//
// Why notifee at all: Android renders the countdown itself when a notification
// sets `showChronometer` + a future `timestamp`. The digits keep moving with no
// JS running, which is exactly what issue #32 needs, and expo-notifications
// exposes no equivalent. See docs/DECISIONS.md D009.
//
// Why `require` behind a guard rather than a top-level import: notifee builds
// its API object at module-evaluation time (`dist/index.js` → `new
// NotifeeApiModule(...)`), and that constructor reads the `native` getter,
// which throws "Notifee native module not found." wherever the native code is
// absent — Expo Go, above all. So the guard has to run BEFORE the require, and
// the try/catch is only a second line of defence.
//
// Web never reaches this file at all: `restNotifications.web.ts` is a sibling
// platform extension, so Metro resolves notifee out of the web bundle graph
// entirely instead of merely never calling it.

import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import { REST_CHANNEL_ID, REST_DONE_CHANNEL_ID } from "./notifications";

// Fixed ids: the ongoing notification is posted once and never updated (the
// system draws the countdown), and cancelling is a matter of knowing the ids.
const ONGOING_ID = "rest-timer-ongoing";
const BELL_ID = "rest-timer-bell";

// How long the "rest over" notification lingers in the shade. It exists to
// make a sound, not to be read, so it clears itself shortly after ringing.
const BELL_TIMEOUT_MS = 10_000;

type NotifeeModule = typeof import("@notifee/react-native");

const supported =
  Platform.OS === "android" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let cached: NotifeeModule | null | undefined;

function getNotifee(): NotifeeModule | null {
  if (cached !== undefined) return cached;
  if (!supported) {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cached = require("@notifee/react-native") as NotifeeModule;
  } catch {
    cached = null;
  }
  return cached;
}

export interface RestNotificationOptions {
  /** Wall-clock instant, in ms, at which the rest ends. */
  endsAt: number;
  exerciseName: string;
  setNumber: number;
}

export async function showRestNotification(opts: RestNotificationOptions): Promise<void> {
  const mod = getNotifee();
  if (!mod) return;

  const remaining = opts.endsAt - Date.now();
  if (remaining <= 0) return;

  const notifee = mod.default;
  const body = `${opts.exerciseName} — set ${opts.setNumber}`;

  try {
    await notifee.displayNotification({
      id: ONGOING_ID,
      title: "Rest",
      body,
      android: {
        channelId: REST_CHANNEL_ID,
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: true,
        showChronometer: true,
        chronometerDirection: "down",
        timestamp: opts.endsAt,
        // Android removes the notification by itself the moment the countdown
        // hits zero, so nothing has to be running to clean it up.
        timeoutAfter: remaining,
        smallIcon: "notification_icon",
        color: "#3b82f6",
        pressAction: { id: "default" },
      },
    });
  } catch {
    // Notification permission denied or the channel is blocked — the on-screen
    // timer still works, so this is not worth interrupting the workout for.
  }

  try {
    // Exact alarms can be revoked by the user on API 31-33. When they are, fall
    // back to an inexact alarm (the bell may drift by a few seconds under Doze)
    // rather than dropping it — and never pop the system settings screen
    // unprompted.
    let alarmType = mod.AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE;
    try {
      const settings = await notifee.getNotificationSettings();
      if (settings.android?.alarm === mod.AndroidNotificationSetting.DISABLED) {
        alarmType = mod.AlarmType.SET_AND_ALLOW_WHILE_IDLE;
      }
    } catch {
      // Settings unreadable — try the exact alarm and let the catch below deal
      // with a rejection.
    }

    await notifee.createTriggerNotification(
      {
        id: BELL_ID,
        title: "Rest over",
        body,
        android: {
          channelId: REST_DONE_CHANNEL_ID,
          smallIcon: "notification_icon",
          color: "#3b82f6",
          autoCancel: true,
          timeoutAfter: BELL_TIMEOUT_MS,
          pressAction: { id: "default" },
        },
      },
      {
        type: mod.TriggerType.TIMESTAMP,
        timestamp: opts.endsAt,
        alarmManager: { type: alarmType },
      },
    );
  } catch {
    // Scheduling refused — the countdown still runs, it just ends quietly.
  }
}

export async function cancelRestNotifications(): Promise<void> {
  const mod = getNotifee();
  if (!mod) return;
  try {
    // `cancelNotification` removes displayed and trigger notifications alike.
    await Promise.all([
      mod.default.cancelNotification(ONGOING_ID),
      mod.default.cancelNotification(BELL_ID),
    ]);
  } catch {
    // Nothing to cancel, or the native module went away — ignore.
  }
}
