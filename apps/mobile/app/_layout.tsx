import "../global.css";
import { useEffect, useState } from "react";
import { Platform, View, ActivityIndicator } from "react-native";
import { Slot, Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

// ---------------------------------------------------------------------------
// Auth gate – redirects to /auth/login or out of /auth based on session
// ---------------------------------------------------------------------------
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) {
      // Not signed in → go to login
      router.replace("/auth/login");
    } else if (session && inAuthGroup) {
      // Signed in but still on auth screen → go home
      router.replace("/");
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f0f1a" }}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------
export default function RootLayout() {
  const [dbReady, setDbReady] = useState(Platform.OS === "web");

  useEffect(() => {
    if (Platform.OS !== "web") {
      // Initialize the local SQLite database on native
      const { migrateDb } = require("../src/db") as typeof import("../src/db");
      migrateDb();
      setDbReady(true);
    }
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f0f1a" }}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AuthGate>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: "#1a1a2e" },
                headerTintColor: "#ffffff",
                headerTitleStyle: { fontWeight: "bold" },
                contentStyle: { backgroundColor: "#0f0f1a" },
              }}
            >
              {/* Hide the header for the auth group */}
              <Stack.Screen name="auth" options={{ headerShown: false }} />
            </Stack>
          </AuthGate>
        </SafeAreaProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
