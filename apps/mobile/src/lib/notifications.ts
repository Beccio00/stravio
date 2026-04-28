import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PREF_KEY = "notif_enabled";
const MOCK_SCHEDULED_KEY = "notif_scheduled";

// Mocked notifications: keep the public API stable without expo-notifications.

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  return true;
}

export async function scheduleDaily(): Promise<void> {
  await SecureStore.setItemAsync(MOCK_SCHEDULED_KEY, "true");
}

export async function cancelReminder(): Promise<void> {
  await SecureStore.setItemAsync(MOCK_SCHEDULED_KEY, "false");
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
