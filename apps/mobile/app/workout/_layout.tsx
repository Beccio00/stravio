import { Stack } from "expo-router";
import { usePreferences } from "../../src/contexts/PreferencesContext";

export default function WorkoutLayout() {
  const { resolvedTheme } = usePreferences();
  const isLight = resolvedTheme === "light";

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: isLight ? "#ffffff" : "#121b2e" },
        headerTintColor: isLight ? "#0f172a" : "#f8fafc",
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: isLight ? "#f8fafc" : "#0b1220" },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "Workout", headerBackTitle: "Sheet" }} />
    </Stack>
  );
}
