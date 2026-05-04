import "../global.css";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { persister } from "../src/lib/queryPersister";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { vars } from "nativewind";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { PreferencesProvider, usePreferences } from "../src/contexts/PreferencesContext";
import { init as initNotifications } from "../src/lib/notifications";
import { StateBlock } from "../src/components/ui";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

// ---------------------------------------------------------------------------
// Theme tokens per resolved theme
// ---------------------------------------------------------------------------
const DARK_VARS = vars({
  "--color-background": "#0b1220",
  "--color-surface": "#121b2e",
  "--color-surface-light": "#1a2740",
  "--color-surface-muted": "#0f1728",
  "--color-text-primary": "#f8fafc",
  "--color-text-secondary": "#c0c9d8",
  "--color-text-muted": "#7c8aa5",
  "--color-border": "#24324a",
  "--color-action-secondary": "#1f2b44",
  "--color-action-secondary-press": "#2a3b5f",
});

const LIGHT_VARS = vars({
  "--color-background": "#f8fafc",
  "--color-surface": "#ffffff",
  "--color-surface-light": "#f1f5f9",
  "--color-surface-muted": "#e2e8f0",
  "--color-text-primary": "#0f172a",
  "--color-text-secondary": "#334155",
  "--color-text-muted": "#64748b",
  "--color-border": "#cbd5e1",
  "--color-action-secondary": "#e2e8f0",
  "--color-action-secondary-press": "#cbd5e1",
});

// ---------------------------------------------------------------------------
// Auth gate – redirects to /auth/login or out of /auth based on session
// ---------------------------------------------------------------------------
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, configError } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || configError) return;

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) {
      router.replace("/auth/login");
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, loading, segments]);

  if (configError) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <StateBlock
          title="App configuration missing"
          description={configError}
          tone="danger"
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Themed stack — reads resolvedTheme from context
// ---------------------------------------------------------------------------
function ThemedStack() {
  const { resolvedTheme } = usePreferences();

  const isLight = resolvedTheme === "light";
  const headerBg = isLight ? "#ffffff" : "#121b2e";
  const headerTint = isLight ? "#0f172a" : "#f8fafc";
  const contentBg = isLight ? "#f8fafc" : "#0b1220";

  return (
    <AuthGate>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: headerTint,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: contentBg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="sheet" options={{ headerShown: false }} />
        <Stack.Screen name="workout" options={{ headerShown: false }} />
      </Stack>
    </AuthGate>
  );
}

// ---------------------------------------------------------------------------
// Preferences gate — shows loading spinner until preferences are loaded
// ---------------------------------------------------------------------------
function PreferencesGate({ children }: { children: React.ReactNode }) {
  const { loading } = usePreferences();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0b1220" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------
export default function RootLayout() {
  useEffect(() => { initNotifications().catch(() => {}); }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PreferencesProvider>
        <PreferencesGate>
          <AuthProvider>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
            >
              <SafeAreaProvider>
                <ThemeRoot />
              </SafeAreaProvider>
            </PersistQueryClientProvider>
          </AuthProvider>
        </PreferencesGate>
      </PreferencesProvider>
    </GestureHandlerRootView>
  );
}

// Must be a child of PreferencesProvider to call usePreferences()
function ThemeRoot() {
  const { resolvedTheme } = usePreferences();
  const themeVars = resolvedTheme === "light" ? LIGHT_VARS : DARK_VARS;

  return (
    <View style={[{ flex: 1 }, themeVars]}>
      <StatusBar style={resolvedTheme === "light" ? "dark" : "light"} />
      <ThemedStack />
    </View>
  );
}
