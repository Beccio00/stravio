import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const raw = (key: string, def: string) =>
  Platform.OS === "web"
    ? Promise.resolve(def)
    : SecureStore.getItemAsync(key).then((v) => v ?? def);
const write = (key: string, val: string) =>
  Platform.OS !== "web" ? SecureStore.setItemAsync(key, val) : Promise.resolve();

export const prefs = {
  restEnabled: {
    get: () => raw("pref_rest_enabled", "true").then((v) => v === "true"),
    set: (v: boolean) => write("pref_rest_enabled", v ? "true" : "false"),
  },
  restDefaultSec: {
    get: () => raw("pref_rest_default_sec", "60").then(Number),
    set: (v: number) => write("pref_rest_default_sec", String(v)),
  },
  theme: {
    get: () => raw("pref_theme", "dark"),
    set: (v: string) => write("pref_theme", v),
  },
};
