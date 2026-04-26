import { View, Text, Switch, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import * as notifications from "../../src/lib/notifications";

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
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-6">
        <Text className="text-text-primary text-xl font-bold mb-6">Notifications</Text>
        <View className="bg-surface rounded-2xl p-5 border border-border">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-text-primary text-base font-semibold">Daily workout reminder</Text>
              <Text className="text-text-secondary text-sm mt-1">
                {Platform.OS === "web" ? "Not supported on web" : "Every day at 9:00 AM"}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              disabled={loading || Platform.OS === "web"}
              trackColor={{ false: "#2a2a3e", true: "#6c63ff" }}
              thumbColor={enabled ? "#ffffff" : "#a0a0b0"}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
