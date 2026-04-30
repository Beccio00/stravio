import { useMemo, useState } from "react";
import { Alert, FlatList, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react-native";
import type { WorkoutSessionWithSheet } from "@bhmt3wp/shared";
import { useCompletedSessions, useDeleteSession } from "../../../src/api/hooks";
import {
  Card,
  ICON_SIZE,
  ICON_STROKE,
  ScreenHeader,
  StateBlock,
} from "../../../src/components/ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { data: sessions, isLoading } = useCompletedSessions();
  const deleteSession = useDeleteSession();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const workoutDays = useMemo(() => {
    const set = new Set<string>();
    if (sessions) {
      for (const s of sessions) {
        if (s.completedAt) {
          const d = new Date(s.completedAt);
          set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
        }
      }
    }
    return set;
  }, [sessions]);

  const monthSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => {
      if (!s.completedAt) return false;
      const d = new Date(s.completedAt);
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    });
  }, [sessions, calYear, calMonth]);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);

  const confirmDeleteSession = (id: string, sheetName: string) => {
    const title = "Delete workout";
    const message = `Delete \"${sheetName}\" from history? This cannot be undone.`;
    const runDelete = () => deleteSession.mutate(id);

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) runDelete();
    } else {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: runDelete },
      ]);
    }
  };

  const goToPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const renderCalendar = () => {
    const cells: JSX.Element[] = [];

    for (const name of DAYS) {
      cells.push(
        <View key={`h-${name}`} className="flex-1 items-center py-1.5">
          <Text className="text-text-muted text-xs font-semibold">{name}</Text>
        </View>,
      );
    }

    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`e-${i}`} className="flex-1 items-center py-1.5" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const hasWorkout = workoutDays.has(dateStr);
      const isToday =
        day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

      cells.push(
        <View key={`d-${day}`} className="flex-1 items-center py-1.5">
          <View
            className={`h-8 w-8 items-center justify-center rounded-full ${
              hasWorkout ? "bg-emphasis" : isToday ? "border border-action-primary" : ""
            }`}
          >
            <Text
              className={`text-sm ${
                hasWorkout
                  ? "font-bold text-background"
                  : isToday
                    ? "font-bold text-action-primary"
                    : "text-text-secondary"
              }`}
            >
              {day}
            </Text>
          </View>
        </View>,
      );
    }

    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remaining; i++) {
      cells.push(<View key={`r-${i}`} className="flex-1 items-center py-1.5" />);
    }

    const rows: JSX.Element[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(
        <View key={`row-${i}`} className="flex-row">
          {cells.slice(i, i + 7)}
        </View>,
      );
    }

    return rows;
  };

  const renderSession = ({ item }: { item: WorkoutSessionWithSheet }) => {
    const date = item.completedAt ? new Date(item.completedAt) : new Date(item.startedAt);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/history/${item.id}`)}
        onLongPress={() => confirmDeleteSession(item.id, item.sheetName)}
        delayLongPress={360}
        activeOpacity={0.8}
      >
        <Card className="mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-text-primary text-base font-bold">{item.sheetName}</Text>
              <View className="mt-1 flex-row items-center">
                <Clock3 size={14} strokeWidth={2} color="#7c8aa5" />
                <Text className="ml-1.5 text-text-muted text-sm">
                  {date.toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>

            <ChevronRight size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#7c8aa5" />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {isLoading ? (
        <View className="px-5 pt-8">
          <StateBlock title="Loading workout history" description="Preparing your session timeline." />
        </View>
      ) : (
        <FlatList
          data={monthSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          extraData={deleteSession.isPending}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
          ListHeaderComponent={
            <>
              <View className="pt-3 pb-2">
                <ScreenHeader
                  title="History"
                  subtitle="Review completed sessions month by month."
                  icon={CalendarDays}
                />
              </View>

              <Card className="mt-2 mb-4" padding="md">
                <View className="mb-3 flex-row items-center justify-between">
                  <TouchableOpacity
                    onPress={goToPrevMonth}
                    className="h-9 w-9 items-center justify-center rounded-xl bg-action-secondary border border-border"
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                  >
                    <ChevronLeft size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#c0c9d8" />
                  </TouchableOpacity>

                  <Text className="text-text-primary text-base font-bold">
                    {MONTHS[calMonth]} {calYear}
                  </Text>

                  <TouchableOpacity
                    onPress={goToNextMonth}
                    className="h-9 w-9 items-center justify-center rounded-xl bg-action-secondary border border-border"
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                  >
                    <ChevronRight size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#c0c9d8" />
                  </TouchableOpacity>
                </View>

                {renderCalendar()}

                <View className="mt-3 flex-row items-center justify-center gap-4">
                  <View className="flex-row items-center">
                    <View className="mr-1.5 h-3 w-3 rounded-full bg-emphasis" />
                    <Text className="text-text-muted text-xs">Logged workout</Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="mr-1.5 h-3 w-3 rounded-full border border-action-primary" />
                    <Text className="text-text-muted text-xs">Today</Text>
                  </View>
                </View>
              </Card>

              <View className="mb-2">
                <Text className="text-text-secondary text-sm">
                  {monthSessions.length > 0
                    ? `${monthSessions.length} session${monthSessions.length === 1 ? "" : "s"} in ${MONTHS[calMonth]}`
                    : `No sessions in ${MONTHS[calMonth]}`}
                </Text>
                <Text className="text-text-muted text-xs mt-1">
                  Tap to open details, long press to delete.
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <StateBlock
              title="Nothing logged this month"
              description="Complete a workout to see it appear in this timeline."
              className="mt-2"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
