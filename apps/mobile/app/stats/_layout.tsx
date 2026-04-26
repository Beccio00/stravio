import { Stack } from "expo-router";

export default function StatsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0f0f1a" },
      }}
    />
  );
}
