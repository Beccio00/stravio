import { useEffect, useState } from "react";
import { Platform, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { BellRing, Globe, LogOut, Moon, Settings2, Smartphone, Sun, Timer, User } from "lucide-react-native";
import { Card, ICON_STROKE, ScreenHeader, StateBlock } from "../../../src/components/ui";
import { useAuth } from "../../../src/contexts/AuthContext";
import { usePreferences, type ThemePreference } from "../../../src/contexts/PreferencesContext";
import * as notifications from "../../../src/lib/notifications";
import { prefs } from "../../../src/lib/preferences";

type ThemeOption = {
  value: ThemePreference;
  label: string;
  Icon: LucideIcon;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Smartphone },
];

const REST_OPTIONS = [30, 45, 60, 90, 120];

function IconCell({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <View className="mr-3 h-8 w-8 items-center justify-center rounded-xl bg-action-secondary border border-border">
      <Icon size={16} strokeWidth={ICON_STROKE} color="#60a5fa" />
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, setTheme } = usePreferences();
  const { user, signOut } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [restEnabled, setRestEnabled] = useState(true);
  const [restDefaultSec, setRestDefaultSec] = useState(60);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    notifications.getEnabled().then((val) => {
      setEnabled(val);
      setLoading(false);
    });
    Promise.all([prefs.restEnabled.get(), prefs.restDefaultSec.get()]).then(([re, rd]) => {
      setRestEnabled(re);
      setRestDefaultSec(rd);
      setPrefsLoading(false);
    });
  }, []);

  const handleRestToggle = async (value: boolean) => {
    setRestEnabled(value);
    await prefs.restEnabled.set(value);
  };

  const handleRestDefault = async (sec: number) => {
    setRestDefaultSec(sec);
    await prefs.restDefaultSec.set(sec);
  };

  const handleToggle = async (value: boolean) => {
    setEnabled(value);
    try {
      await notifications.setEnabled(value);
      if (value) {
        await notifications.scheduleDaily();
      } else {
        await notifications.cancelReminder();
      }
    } catch {
      setEnabled(!value);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 }}>
        <ScreenHeader
          title="Settings"
          subtitle="Tune reminders and keep your routine consistent."
          icon={Settings2}
        />

        <Card className="mt-6" padding="lg">
          <Text className="text-text-primary text-base font-semibold mb-3">Appearance</Text>
          <View className="flex-row gap-3">
            {THEME_OPTIONS.map(({ value, label, Icon }) => {
              const isActive = theme === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setTheme(value)}
                  className={`flex-1 items-center py-3 rounded-xl border ${
                    isActive
                      ? "bg-action-primary border-action-primary"
                      : "bg-action-secondary border-border"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={ICON_STROKE}
                    color={isActive ? "#ffffff" : "#7c8aa5"}
                  />
                  <Text
                    className={`text-xs font-medium mt-1.5 ${
                      isActive ? "text-white" : "text-text-muted"
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card className="mt-4" padding="lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4 flex-row items-center">
              <IconCell icon={Timer} />
              <View className="flex-1">
                <Text className="text-text-primary text-base font-semibold">Rest timer</Text>
                <Text className="text-text-secondary text-sm mt-1">
                  Countdown between sets during a workout.
                </Text>
              </View>
            </View>

            <Switch
              value={restEnabled}
              onValueChange={handleRestToggle}
              disabled={prefsLoading}
              trackColor={{ false: "#24324a", true: "#3b82f6" }}
              thumbColor={restEnabled ? "#f8fafc" : "#c0c9d8"}
            />
          </View>

          {restEnabled ? (
            <View className="mt-4">
              <Text className="text-text-secondary text-sm mb-2">Default rest for new sets</Text>
              <View className="flex-row flex-wrap gap-2">
                {REST_OPTIONS.map((sec) => {
                  const isActive = restDefaultSec === sec;
                  return (
                    <TouchableOpacity
                      key={sec}
                      onPress={() => handleRestDefault(sec)}
                      disabled={prefsLoading}
                      className={`rounded-xl px-3 py-1.5 border ${
                        isActive
                          ? "bg-action-primary border-action-primary"
                          : "bg-action-secondary border-border"
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          isActive ? "text-white" : "text-text-secondary"
                        }`}
                      >
                        {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
        </Card>

        <Card className="mt-4" padding="lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4 flex-row items-start">
              <View className="mt-0.5">
                <IconCell icon={BellRing} />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary text-base font-semibold">Daily workout reminder</Text>
                <Text className="text-text-secondary text-sm mt-1">
                  {Platform.OS === "web"
                    ? "Notifications are not available on web."
                    : "Scheduled every day at 9:00 AM."}
                </Text>
              </View>
            </View>

            <Switch
              value={enabled}
              onValueChange={handleToggle}
              disabled={loading || Platform.OS === "web"}
              trackColor={{ false: "#24324a", true: "#3b82f6" }}
              thumbColor={enabled ? "#f8fafc" : "#c0c9d8"}
            />
          </View>
        </Card>

        {Platform.OS === "web" ? (
          <StateBlock
            title="Mobile-only reminders"
            description="Open the app on iOS or Android to enable scheduled notifications."
            icon={Globe}
            className="mt-4"
          />
        ) : null}

        <Card className="mt-4" padding="lg">
          <View className="flex-row items-center mb-4">
            <IconCell icon={User} />
            <View className="flex-1">
              <Text className="text-text-primary text-base font-semibold">Account</Text>
              <Text className="text-text-secondary text-sm mt-1">{user?.email ?? "—"}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={signOut}
            className="flex-row items-center justify-center rounded-xl border border-danger py-2.5"
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <LogOut size={16} strokeWidth={ICON_STROKE} color="#ef4444" />
            <Text className="ml-2 text-danger font-semibold">Sign out</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
