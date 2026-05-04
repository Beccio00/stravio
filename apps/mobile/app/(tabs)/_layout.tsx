import { useRef, useEffect, useMemo } from "react";
import { Tabs, useRouter, useSegments } from "expo-router";
import { BarChart3, History as HistoryIcon, House, Settings2 } from "lucide-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ICON_SIZE, ICON_STROKE } from "../../src/components/ui";
import { usePreferences } from "../../src/contexts/PreferencesContext";

const TABS = [
  "/(tabs)/",
  "/(tabs)/history",
  "/(tabs)/stats",
  "/(tabs)/settings",
] as const;

function getTabIdx(segments: string[]): number {
  const last = segments[segments.length - 1];
  if (last === "history") return 1;
  if (last === "stats") return 2;
  if (last === "settings") return 3;
  return 0;
}

export default function TabsLayout() {
  const { resolvedTheme } = usePreferences();
  const isLight = resolvedTheme === "light";

  const router = useRouter();
  const segments = useSegments();
  const tabIdxRef = useRef(0);

  useEffect(() => {
    tabIdxRef.current = getTabIdx(segments as string[]);
  }, [segments]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-15, 15])
        .onEnd((e) => {
          const idx = tabIdxRef.current;
          if (e.translationX < -60 && idx < TABS.length - 1) {
            router.navigate(TABS[idx + 1]);
          } else if (e.translationX > 60 && idx > 0) {
            router.navigate(TABS[idx - 1]);
          }
        }),
    // router is stable (expo-router guarantee); tabIdxRef is a ref — no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <GestureDetector gesture={swipeGesture}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: isLight ? "#64748b" : "#7c8aa5",
          tabBarStyle: {
            backgroundColor: isLight ? "#ffffff" : "#0f1728",
            borderTopColor: isLight ? "#cbd5e1" : "#24324a",
            borderTopWidth: 1,
            height: 68,
            paddingTop: 8,
            paddingBottom: 8,
          },
          tabBarItemStyle: {
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
            marginTop: 2,
          },
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <House size={ICON_SIZE} strokeWidth={ICON_STROKE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color }) => (
              <HistoryIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "Stats",
            tabBarIcon: ({ color }) => (
              <BarChart3 size={ICON_SIZE} strokeWidth={ICON_STROKE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => (
              <Settings2 size={ICON_SIZE} strokeWidth={ICON_STROKE} color={color} />
            ),
          }}
        />
      </Tabs>
    </GestureDetector>
  );
}
