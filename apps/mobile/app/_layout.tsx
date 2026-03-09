import "../global.css";
import { useEffect, useState } from "react";
import { Platform, View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#1a1a2e" },
            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "bold" },
            contentStyle: { backgroundColor: "#0f0f1a" },
          }}
        />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
