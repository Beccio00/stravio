import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PREF_KEY = "notif_enabled";
const NOTIF_ID_KEY = "notif_id";

// Reminders are native-only: SecureStore has no web implementation and
// expo-notifications cannot schedule on web.
const isWeb = Platform.OS === "web";

// Channel ids are versioned because Android freezes a channel's importance,
// sound and vibration the first time it is created on a device: changing any
// of them later is only possible under a NEW id. To change importance or
// sound, bump the `-vN` suffix — never the human-readable name.
export const REST_CHANNEL_ID = "rest-timer-v1";
export const REST_DONE_CHANNEL_ID = "rest-done-v1";

// Without a handler, expo-notifications silently swallows any notification
// that arrives while the app is in the foreground — which is why the daily
// reminder was invisible when the app happened to be open.
if (!isWeb) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Native module unavailable (e.g. an unsupported runtime) — ignore.
  }
}

export async function requestPermission(): Promise<boolean> {
  if (isWeb) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function scheduleDaily(): Promise<void> {
  if (isWeb) return;
  try {
    await cancelReminder();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to train",
        body: "Open Stravio and log today's workout.",
      },
      trigger: { type: SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 },
    });
    await SecureStore.setItemAsync(NOTIF_ID_KEY, id);
  } catch {
    // Permission denied or notifications unavailable — fail silently.
  }
}

export async function cancelReminder(): Promise<void> {
  if (isWeb) return;
  try {
    const id = await SecureStore.getItemAsync(NOTIF_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await SecureStore.deleteItemAsync(NOTIF_ID_KEY);
    }
  } catch {
    // Nothing scheduled or store unavailable — ignore.
  }
}

export async function getEnabled(): Promise<boolean> {
  if (isWeb) return false;
  const val = await SecureStore.getItemAsync(PREF_KEY);
  return val === null ? true : val === "true";
}

export async function setEnabled(enabled: boolean): Promise<void> {
  if (isWeb) return;
  await SecureStore.setItemAsync(PREF_KEY, enabled ? "true" : "false");
}

export async function init(): Promise<void> {
  if (isWeb) return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });

      // The ongoing rest countdown. LOW keeps it silent and out of the
      // heads-up banner area: it is a status readout, not an alert.
      await Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
        name: "Rest timer",
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        vibrationPattern: null,
        enableVibrate: false,
      });

      // The bell at zero. DEFAULT plays the sound without raising a heads-up
      // banner, which is exactly "a sound, not a real notification".
      // `bell` is the res/raw resource name, without the extension.
      await Notifications.setNotificationChannelAsync(REST_DONE_CHANNEL_ID, {
        name: "Rest timer finished",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "bell",
      });
    }
    const stored = await SecureStore.getItemAsync(PREF_KEY);
    const granted = await requestPermission();
    if (!granted) return;
    if (stored === null) {
      await setEnabled(true);
      await scheduleDaily();
    } else if (stored === "true") {
      await scheduleDaily();
    }
  } catch {
    // Guard against any native module error on cold start.
  }
}
