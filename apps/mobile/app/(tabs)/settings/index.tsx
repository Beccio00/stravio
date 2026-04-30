import { useEffect, useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BellRing, Globe, Settings2 } from "lucide-react-native";
import { Card, ICON_STROKE, ScreenHeader, StateBlock } from "../../../src/components/ui";
import * as notifications from "../../../src/lib/notifications";

export default function SettingsScreen() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notifications.getEnabled().then((val) => {
      setEnabled(val);
      setLoading(false);
    });
  }, []);

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
      <View className="px-5 pt-3">
        <ScreenHeader
          title="Settings"
          subtitle="Tune reminders and keep your routine consistent."
          icon={Settings2}
        />

        <Card className="mt-6" padding="lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4 flex-row items-start">
              <View className="mr-3 mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-action-secondary border border-border">
                <BellRing size={16} strokeWidth={ICON_STROKE} color="#60a5fa" />
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
      </View>
    </SafeAreaView>
  );
}
