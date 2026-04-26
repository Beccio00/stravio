import { Stack } from "expo-router";
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: "#1a1a2e" },
      headerTintColor: "#ffffff",
      headerTitleStyle: { fontWeight: "bold" },
      contentStyle: { backgroundColor: "#0f0f1a" },
      title: "Settings",
    }} />
  );
}
