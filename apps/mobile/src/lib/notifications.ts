import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PREF_KEY = "notif_enabled";
const NOTIF_ID_KEY = "notif_id";

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
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
  const val = await SecureStore.getItemAsync(PREF_KEY);
  return val === null ? true : val === "true";
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(PREF_KEY, enabled ? "true" : "false");
}

export async function init(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
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
