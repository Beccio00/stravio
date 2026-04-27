import { Stack } from "expo-router";

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#121b2e" },
        headerTintColor: "#f8fafc",
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#0b1220" },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "Workout", headerBackTitle: "Sheet" }} />
    </Stack>
  );
}
