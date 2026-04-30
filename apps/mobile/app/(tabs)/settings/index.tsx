import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { BellRing, Globe, Timer, Palette, User, LogOut } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Card, ICON_STROKE, ScreenHeader, StateBlock } from "../../../src/components/ui";
import * as notifications from "../../../src/lib/notifications";
import { prefs } from "../../../src/lib/preferences";
import { useAuth } from "../../../src/contexts/AuthContext";

function IconCell({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <View className="mr-3 h-8 w-8 items-center justify-center rounded-xl bg-action-secondary border border-border">
      <Icon size={16} strokeWidth={ICON_STROKE} color="#60a5fa" />
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifLoading, setNotifLoading] = useState(true);

  const [restEnabled, setRestEnabled] = useState(true);
  const [restDefaultSec, setRestDefaultSec] = useState(60);
  const [theme, setTheme] = useState("dark");
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    notifications.getEnabled().then((val) => {
      setNotifEnabled(val);
      setNotifLoading(false);
    });
    Promise.all([
      prefs.restEnabled.get(),
      prefs.restDefaultSec.get(),
      prefs.theme.get(),
    ]).then(([re, rd, th]) => {
      setRestEnabled(re);
      setRestDefaultSec(rd);
      setTheme(th);
      setPrefsLoading(false);
    });
  }, []);

  const handleNotifToggle = async (value: boolean) => {
    setNotifEnabled(value);
    try {
      await notifications.setEnabled(value);
      if (value) {
        await notifications.scheduleDaily();
      } else {
        await notifications.cancelReminder();
      }
    } catch {
      setNotifEnabled(!value);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1 px-5 pt-3" contentContainerStyle={{ paddingBottom: 40 }}>
        <ScreenHeader
          title="Settings"
          subtitle="Tune reminders and keep your routine consistent."
          icon={Timer}
        />

        {/* Notifications */}
        <Card className="mt-6" padding="lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4 flex-row items-start">
              <IconCell icon={BellRing} />
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
              value={notifEnabled}
              onValueChange={handleNotifToggle}
              disabled={notifLoading || Platform.OS === "web"}
              trackColor={{ false: "#24324a", true: "#3b82f6" }}
              thumbColor={notifEnabled ? "#f8fafc" : "#c0c9d8"}
            />
          </View>
        </Card>

        {Platform.OS === "web" && (
          <StateBlock
            title="Mobile-only reminders"
            description="Open the app on iOS or Android to enable scheduled notifications."
            icon={Globe}
            className="mt-4"
          />
        )}

        {/* Rest Timer */}
        <Card className="mt-4" padding="lg">
          <Text className="text-text-primary font-semibold mb-3">Rest Timer</Text>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <IconCell icon={Timer} />
              <Text className="text-text-primary text-base">Enable rest timer</Text>
            </View>
            <Switch
              value={restEnabled}
              onValueChange={async (v) => {
                setRestEnabled(v);
                await prefs.restEnabled.set(v);
              }}
              disabled={prefsLoading}
              trackColor={{ false: "#24324a", true: "#3b82f6" }}
              thumbColor={restEnabled ? "#f8fafc" : "#c0c9d8"}
            />
          </View>
          {restEnabled && (
            <>
              <Text className="text-text-secondary text-sm mb-2">Default rest duration</Text>
              <View className="flex-row flex-wrap gap-2">
                {[30, 45, 60, 90, 120].map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    onPress={async () => {
                      setRestDefaultSec(sec);
                      await prefs.restDefaultSec.set(sec);
                    }}
                    className={`rounded-xl px-3 py-1.5 border ${
                      restDefaultSec === sec
                        ? "bg-action-primary border-action-primary"
                        : "bg-action-secondary border-border"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        restDefaultSec === sec ? "text-white" : "text-text-secondary"
                      }`}
                    >
                      {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </Card>

        {/* Theme */}
        <Card className="mt-4" padding="lg">
          <View className="flex-row items-center mb-3">
            <IconCell icon={Palette} />
            <Text className="text-text-primary font-semibold">Theme</Text>
          </View>
          <View className="flex-row gap-2">
            {(["dark", "system"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={async () => {
                  setTheme(t);
                  await prefs.theme.set(t);
                }}
                className={`flex-1 rounded-xl px-3 py-2 items-center border ${
                  theme === t
                    ? "bg-action-primary border-action-primary"
                    : "bg-action-secondary border-border"
                }`}
              >
                <Text className={`text-sm font-semibold ${theme === t ? "text-white" : "text-text-secondary"}`}>
                  {t === "dark" ? "Dark" : "System"}
                </Text>
              </TouchableOpacity>
            ))}
            <View className="flex-1 rounded-xl px-3 py-2 items-center border border-border bg-surface opacity-40">
              <Text className="text-text-muted text-sm font-semibold">Light</Text>
              <Text className="text-text-muted text-[10px]">soon</Text>
            </View>
          </View>
        </Card>

        {/* Account */}
        <Card className="mt-4" padding="lg">
          <View className="flex-row items-center mb-4">
            <IconCell icon={User} />
            <View className="flex-1">
              <Text className="text-text-primary font-semibold">Account</Text>
              <Text className="text-text-secondary text-sm mt-0.5">{user?.email ?? "—"}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={signOut}
            className="flex-row items-center justify-center rounded-xl border border-danger py-2.5 gap-2"
          >
            <LogOut size={16} strokeWidth={ICON_STROKE} color="#ef4444" />
            <Text className="text-danger font-semibold">Sign out</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
