import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform, useColorScheme } from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ThemePreference = "dark" | "light" | "system";

interface PreferencesState {
  theme: ThemePreference;
  /** Resolved theme — "system" is resolved to the actual OS setting */
  resolvedTheme: "dark" | "light";
  setTheme: (t: ThemePreference) => void;
}

const PreferencesContext = createContext<PreferencesState | undefined>(undefined);

// ---------------------------------------------------------------------------
// Persistent storage helpers (same cross-platform pattern as supabase.ts)
// ---------------------------------------------------------------------------
const THEME_KEY = "stravio:theme";

function parseTheme(v: string | null | undefined): ThemePreference | null {
  if (v === "dark" || v === "light" || v === "system") return v;
  return null;
}

function readStoredSync(): ThemePreference | null {
  // Only available synchronously on web via localStorage; native boots to "dark"
  // and hydrates asynchronously after mount.
  if (Platform.OS !== "web") return null;
  try {
    return parseTheme(globalThis.localStorage?.getItem(THEME_KEY));
  } catch {
    return null;
  }
}

async function readStoredNative(): Promise<ThemePreference | null> {
  try {
    const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
    return parseTheme(await SecureStore.getItemAsync(THEME_KEY));
  } catch {
    return null;
  }
}

async function writeStored(value: ThemePreference): Promise<void> {
  try {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(THEME_KEY, value);
      return;
    }
    const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
    await SecureStore.setItemAsync(THEME_KEY, value);
  } catch {
    // Non-critical — swallow storage errors
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const osScheme = useColorScheme();

  const [theme, setThemeState] = useState<ThemePreference>(
    () => readStoredSync() ?? "dark",
  );

  // Native only: hydrate from SecureStore after mount (no synchronous API)
  useEffect(() => {
    if (Platform.OS === "web") return;
    readStoredNative().then((stored) => {
      if (stored !== null) setThemeState(stored);
    });
  }, []);

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
    writeStored(t);
  }, []);

  const resolvedTheme: "dark" | "light" =
    theme === "system"
      ? (osScheme === "light" ? "light" : "dark")
      : theme;

  return (
    <PreferencesContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </PreferencesContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within a PreferencesProvider");
  return ctx;
}
