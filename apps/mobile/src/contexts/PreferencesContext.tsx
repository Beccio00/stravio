import React, { createContext, useContext, useEffect, useState } from "react";
import { prefs } from "../lib/preferences";

export type ThemePreference = "dark" | "system";

interface PreferencesState {
  loading: boolean;
  restEnabled: boolean;
  restDefaultSec: number;
  theme: ThemePreference;
  setRestEnabled: (value: boolean) => Promise<void>;
  setRestDefaultSec: (value: number) => Promise<void>;
  setTheme: (value: ThemePreference) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesState | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [restEnabled, setRestEnabledState] = useState(true);
  const [restDefaultSec, setRestDefaultSecState] = useState(60);
  const [theme, setThemeState] = useState<ThemePreference>("dark");

  useEffect(() => {
    let mounted = true;

    Promise.all([prefs.restEnabled.get(), prefs.restDefaultSec.get(), prefs.theme.get()])
      .then(([storedRestEnabled, storedRestDefaultSec, storedTheme]) => {
        if (!mounted) {
          return;
        }

        setRestEnabledState(storedRestEnabled);
        setRestDefaultSecState(storedRestDefaultSec);
        setThemeState(storedTheme === "system" ? "system" : "dark");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setRestEnabled = async (value: boolean) => {
    setRestEnabledState(value);
    await prefs.restEnabled.set(value);
  };

  const setRestDefaultSec = async (value: number) => {
    setRestDefaultSecState(value);
    await prefs.restDefaultSec.set(value);
  };

  const setTheme = async (value: ThemePreference) => {
    setThemeState(value);
    await prefs.theme.set(value);
  };

  return (
    <PreferencesContext.Provider
      value={{
        loading,
        restEnabled,
        restDefaultSec,
        theme,
        setRestEnabled,
        setRestDefaultSec,
        setTheme,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }

  return context;
}