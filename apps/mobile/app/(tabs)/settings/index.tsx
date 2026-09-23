import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import type { LucideIcon } from "lucide-react-native";
import {
  BellRing,
  FileJson,
  FileSpreadsheet,
  FileText,
  Globe,
  LogOut,
  Moon,
  Settings2,
  Smartphone,
  Sun,
  Timer,
  Upload,
  User,
} from "lucide-react-native";
import { Card, ICON_STROKE, ScreenHeader, StateBlock } from "../../../src/components/ui";
import { useAuth } from "../../../src/contexts/AuthContext";
import { usePreferences, type ThemePreference } from "../../../src/contexts/PreferencesContext";
import * as notifications from "../../../src/lib/notifications";
import { prefs } from "../../../src/lib/preferences";
import { useImportSheets, useSheets } from "../../../src/api/hooks";
import { api } from "../../../src/api/client";
import { exportCSV, exportJSON, exportPDF, pickAndParseFile } from "../../../src/lib/sheetsIO";
import type { WorkoutSheetFull } from "@bhmt3wp/shared";

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

function ActionRow({
  icon: Icon,
  label,
  description,
  onPress,
  disabled = false,
  color = "#60a5fa",
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      className={disabled ? "opacity-50" : ""}
    >
      <View className="flex-row items-center py-3">
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-xl bg-action-secondary border border-border">
          <Icon size={16} strokeWidth={ICON_STROKE} color={color} />
        </View>
        <View className="flex-1">
          <Text className="text-text-primary text-base font-semibold">{label}</Text>
          <Text className="text-text-secondary text-sm mt-0.5">{description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Divider() {
  return <View className="h-px bg-border" />;
}

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function confirmImport(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Import", onPress: () => resolve(true) },
    ]);
  });
}

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
  const { data: sheets } = useSheets();
  const importSheets = useImportSheets();
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
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

  const handleExport = async (format: "json" | "csv" | "pdf") => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const full: WorkoutSheetFull[] = sheets?.length
        ? await Promise.all(sheets.map((s) => api.sheets.get(s.id)))
        : [];
      if (full.length === 0) {
        notify("Nothing to export", "Create at least one sheet before exporting.");
        return;
      }
      if (format === "json") await exportJSON(full);
      else if (format === "csv") await exportCSV(full);
      else await exportPDF(full);
    } catch (err) {
      notify("Export error", err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExportBusy(false);
    }
  };

  const handleImport = async () => {
    if (importBusy) return;
    setImportBusy(true);
    try {
      const parsed = await pickAndParseFile();
      if (!parsed) return; // cancelled

      const noun = parsed.length === 1 ? "sheet" : "sheets";
      const confirmed = await confirmImport(
        `Import ${parsed.length} ${noun}?`,
        `"${parsed.map((s) => s.name).join('", "')}" will be added to your sheets. Existing sheets are not modified.`,
      );
      if (!confirmed) return;

      await importSheets.mutateAsync(parsed);
      notify("Import complete", `${parsed.length} ${noun} imported.`);
    } catch (err) {
      notify("Import error", err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportBusy(false);
    }
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

        <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mt-8 mb-3 px-1">
          Export sheets
        </Text>
        <Card padding="md">
          <ActionRow
            icon={FileJson}
            label="Export as JSON"
            description="Full backup — re-importable, all data preserved."
            onPress={() => handleExport("json")}
            disabled={exportBusy}
            color="#a78bfa"
          />
          <Divider />
          <ActionRow
            icon={FileSpreadsheet}
            label="Export as CSV"
            description="Flat spreadsheet, one row per set."
            onPress={() => handleExport("csv")}
            disabled={exportBusy}
            color="#34d399"
          />
          <Divider />
          <ActionRow
            icon={FileText}
            label="Export as PDF"
            description="Printable summary of every sheet."
            onPress={() => handleExport("pdf")}
            disabled={exportBusy}
            color="#f87171"
          />
        </Card>

        <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mt-8 mb-3 px-1">
          Import sheets
        </Text>
        <Card padding="md">
          <ActionRow
            icon={Upload}
            label="Import from JSON or CSV"
            description="Pick a previously exported file to restore sheets."
            onPress={handleImport}
            disabled={importBusy}
            color="#fb923c"
          />
        </Card>
        <Text className="text-text-muted text-xs mt-3 px-1 leading-5">
          Importing adds new sheets and never modifies or deletes existing ones.
        </Text>

        <Card className="mt-8" padding="lg">
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

        {/* Tells at a glance which build is running, on web and on device. */}
        <Text className="text-text-muted text-xs text-center mt-6">
          Stravio v{Constants.expoConfig?.version ?? "—"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
