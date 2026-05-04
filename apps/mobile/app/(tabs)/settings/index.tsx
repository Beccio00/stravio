import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BellRing,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Globe,
  Settings2,
  Upload,
} from "lucide-react-native";
import { Card, ICON_STROKE, ScreenHeader, StateBlock } from "../../../src/components/ui";
import * as notifications from "../../../src/lib/notifications";
import { useSheets } from "../../../src/api/hooks";
import { useImportSheets } from "../../../src/api/hooks";
import { exportCSV, exportJSON, exportPDF, pickAndParseFile } from "../../../src/lib/sheetsIO";
import type { WorkoutSheetFull } from "@bhmt3wp/shared";
import { api } from "../../../src/api/client";

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function ActionRow({
  icon: Icon,
  label,
  description,
  onPress,
  disabled = false,
  color = "#60a5fa",
}: {
  icon: any;
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
  return <View className="h-px bg-border mx-0 my-0" />;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifLoading, setNotifLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

  const { data: sheets } = useSheets();
  const importSheets = useImportSheets();

  useEffect(() => {
    notifications.getEnabled().then((val) => {
      setNotifEnabled(val);
      setNotifLoading(false);
    });
  }, []);

  const handleToggleNotif = async (value: boolean) => {
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

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  async function fetchFullSheets(): Promise<WorkoutSheetFull[]> {
    if (!sheets?.length) return [];
    return Promise.all(sheets.map((s) => api.sheets.get(s.id)));
  }

  async function handleExport(format: "json" | "csv" | "pdf") {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const full = await fetchFullSheets();
      if (full.length === 0) {
        showAlert("Nothing to export", "Create at least one sheet before exporting.");
        return;
      }
      if (format === "json") await exportJSON(full);
      else if (format === "csv") await exportCSV(full);
      else await exportPDF(full);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed.";
      showAlert("Export error", msg);
    } finally {
      setExportBusy(false);
    }
  }

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------

  async function handleImport() {
    if (importBusy) return;
    setImportBusy(true);
    try {
      const parsed = await pickAndParseFile();
      if (!parsed) return; // user cancelled

      const count = parsed.length;
      const noun = count === 1 ? "sheet" : "sheets";

      const proceed = await confirmImport(
        `Import ${count} ${noun}?`,
        `"${parsed.map((s) => s.name).join('", "')}" will be added to your sheets. Existing sheets are not modified.`,
      );
      if (!proceed) return;

      await importSheets.mutateAsync(parsed);
      showAlert("Import complete", `${count} ${noun} imported successfully.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      showAlert("Import error", msg);
    } finally {
      setImportBusy(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 }}>
        <ScreenHeader
          title="Settings"
          subtitle="Reminders, backup, and data management."
          icon={Settings2}
        />

        {/* Notifications */}
        <Card className="mt-6" padding="lg">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4 flex-row items-start">
              <View className="mr-3 mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-action-secondary border border-border">
                <BellRing size={16} strokeWidth={ICON_STROKE} color="#60a5fa" />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary text-base font-semibold">
                  Daily workout reminder
                </Text>
                <Text className="text-text-secondary text-sm mt-1">
                  {Platform.OS === "web"
                    ? "Notifications are not available on web."
                    : "Scheduled every day at 9:00 AM."}
                </Text>
              </View>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={handleToggleNotif}
              disabled={notifLoading || Platform.OS === "web"}
              trackColor={{ false: "#24324a", true: "#3b82f6" }}
              thumbColor={notifEnabled ? "#f8fafc" : "#c0c9d8"}
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

        {/* Export */}
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
            description="Printable sheet summary."
            onPress={() => handleExport("pdf")}
            disabled={exportBusy}
            color="#f87171"
          />
        </Card>

        {/* Import */}
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

        <Text className="text-text-muted text-xs mt-4 px-1 leading-5">
          Importing adds new sheets and never modifies or deletes existing ones. For a full restore,
          delete your existing sheets first.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function showAlert(title: string, message: string) {
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
