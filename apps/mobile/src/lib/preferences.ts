import { Platform } from "react-native";

let storage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

if (Platform.OS !== "web") {
  const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
  storage = {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
  };
} else {
  storage = {
    getItem: async (key) => globalThis.localStorage?.getItem(key) ?? null,
    setItem: async (key, value) => globalThis.localStorage?.setItem(key, value),
  };
}

const raw = (key: string, def: string) => storage.getItem(key).then((v) => v ?? def);
const write = (key: string, val: string) => storage.setItem(key, val);

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
