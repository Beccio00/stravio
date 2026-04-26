import { Stack } from "expo-router";
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: "#0f0f1a" },
    }} />
  );
}
