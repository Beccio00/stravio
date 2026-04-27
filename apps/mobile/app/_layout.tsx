import "../global.css";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { init as initNotifications } from "../src/lib/notifications";

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
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <AuthGate>
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: "#121b2e" },
                  headerTintColor: "#f8fafc",
                  headerTitleStyle: { fontWeight: "700" },
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: "#0b1220" },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="sheet" options={{ headerShown: false }} />
                <Stack.Screen name="workout" options={{ headerShown: false }} />
              </Stack>
            </AuthGate>
          </SafeAreaProvider>
        </QueryClientProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
