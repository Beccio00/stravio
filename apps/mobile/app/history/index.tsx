import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompletedSessions } from "../../src/api/hooks";
import { useState, useMemo } from "react";
import type { WorkoutSessionWithSheet } from "@bhmt3wp/shared";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export default function HistoryScreen() {
  const router = useRouter();
  const { data: sessions, isLoading } = useCompletedSessions();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // Set of "YYYY-MM-DD" strings for days with workouts
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

  // Sessions for the selected month (for the list below)
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
    const cells: React.ReactNode[] = [];

    // Day names header
    for (const name of DAYS) {
      cells.push(
        <View key={`h-${name}`} className="flex-1 items-center py-1">
          <Text className="text-text-muted text-xs font-semibold">{name}</Text>
        </View>
      );
    }

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`e-${i}`} className="flex-1 items-center py-1" />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const hasWorkout = workoutDays.has(dateStr);
      const isToday =
        day === today.getDate() &&
        calMonth === today.getMonth() &&
        calYear === today.getFullYear();

      cells.push(
        <View key={`d-${day}`} className="flex-1 items-center py-1">
          <View
            className={`w-8 h-8 rounded-full items-center justify-center ${
              hasWorkout
                ? "bg-accent"
                : isToday
                ? "border border-primary"
                : ""
            }`}
          >
            <Text
              className={`text-sm ${
                hasWorkout
                  ? "text-background font-bold"
                  : isToday
                  ? "text-primary font-bold"
                  : "text-text-secondary"
              }`}
            >
              {day}
            </Text>
          </View>
        </View>
      );
    }

    // Fill remaining cells to complete the last row
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remaining; i++) {
      cells.push(<View key={`r-${i}`} className="flex-1 items-center py-1" />);
    }

    // Wrap in rows of 7
    const rows: React.ReactNode[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(
        <View key={`row-${i}`} className="flex-row">
          {cells.slice(i, i + 7)}
        </View>
      );
    }

    return rows;
  };

  const renderSession = ({ item }: { item: WorkoutSessionWithSheet }) => {
    const date = item.completedAt ? new Date(item.completedAt) : new Date(item.startedAt);
    return (
      <TouchableOpacity
        className="bg-surface rounded-2xl p-4 mb-3 border border-border"
        onPress={() => router.push(`/history/${item.id}`)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-text-primary text-base font-bold">{item.sheetName}</Text>
            <Text className="text-text-muted text-sm mt-1">
              {date.toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
          <Text className="text-text-muted text-xl">→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary text-base mb-1">← Back</Text>
        </TouchableOpacity>
        <Text className="text-text-primary text-3xl font-bold">📅 History</Text>
      </View>

      {/* Calendar */}
      <View className="mx-5 bg-surface rounded-2xl p-4 mb-4 border border-border">
        {/* Month navigation */}
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity onPress={goToPrevMonth} className="px-3 py-1">
            <Text className="text-primary text-lg font-bold">‹</Text>
          </TouchableOpacity>
          <Text className="text-text-primary text-base font-bold">
            {MONTHS[calMonth]} {calYear}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} className="px-3 py-1">
            <Text className="text-primary text-lg font-bold">›</Text>
          </TouchableOpacity>
        </View>

        {renderCalendar()}

        {/* Legend */}
        <View className="flex-row items-center justify-center mt-3 gap-4">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-accent mr-1" />
            <Text className="text-text-muted text-xs">Workout</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full border border-primary mr-1" />
            <Text className="text-text-muted text-xs">Today</Text>
          </View>
        </View>
      </View>

      {/* Session list for selected month */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-secondary text-lg">Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={monthSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListHeaderComponent={
            <Text className="text-text-secondary text-sm mb-2">
              {monthSessions.length > 0
                ? `${monthSessions.length} workout${monthSessions.length === 1 ? "" : "s"} in ${MONTHS[calMonth]}`
                : `No workouts in ${MONTHS[calMonth]}`}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
