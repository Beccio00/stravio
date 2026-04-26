import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PREF_KEY = "notif_enabled";
const NOTIF_IDENTIFIER = "daily-workout-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleDaily(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIF_IDENTIFIER).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDENTIFIER,
    content: {
      title: "Time to work out 💪",
      body: "Your daily workout reminder. Keep it up!",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 },
  });
}

export async function cancelReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIF_IDENTIFIER).catch(() => {});
}

export async function getEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(PREF_KEY);
  return val === null ? true : val === "true"; // default: enabled
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(PREF_KEY, enabled ? "true" : "false");
}

export async function init(): Promise<void> {
  if (Platform.OS === "web") return;
  const stored = await SecureStore.getItemAsync(PREF_KEY);
  const granted = await requestPermission();
  if (!granted) return;
  if (stored === null) {
    await setEnabled(true);
    await scheduleDaily();
  } else if (stored === "true") {
    await scheduleDaily();
  }
}
