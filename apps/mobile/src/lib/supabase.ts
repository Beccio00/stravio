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
const SUPABASE_URL = "https://dqtfhrdkikxfxnifnsqs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdGZocmRraWt4ZnhuaWZuc3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDIzNjMsImV4cCI6MjA4ODcxODM2M30.SRxIhAQH2RqBcsTlTOTuq6QmFuItxfDXwYgRuoyXn_8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});
