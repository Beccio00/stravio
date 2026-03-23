import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Persistent storage adapter for Supabase Auth
// On native we use expo-secure-store; on web we fall back to localStorage.
// ---------------------------------------------------------------------------
let storage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

if (Platform.OS !== "web") {
  // Lazy-require so the web bundle never pulls in the native module
  const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
  storage = {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  };
} else {
  storage = {
    getItem: async (key) => globalThis.localStorage?.getItem(key) ?? null,
    setItem: async (key, value) => globalThis.localStorage?.setItem(key, value),
    removeItem: async (key) => globalThis.localStorage?.removeItem(key),
  };
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Missing Supabase env vars: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY)",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});
