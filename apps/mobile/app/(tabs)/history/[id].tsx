import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarDays, Clock3, Dumbbell } from "lucide-react-native";
import { useSession } from "../../../src/api/hooks";
import { Card, ICON_STROKE, StateBlock, cx } from "../../../src/components/ui";

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = id!;
  const { data: session, isLoading } = useSession(sessionId);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background px-5 pt-8" edges={["bottom"]}>
        <StateBlock title="Loading session" description="Fetching workout details." />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-background px-5 pt-8" edges={["bottom"]}>
        <StateBlock
          title="Session not found"
          description="This workout might have been deleted."
          tone="danger"
        />
      </SafeAreaView>
    );
  }

  const date = session.completedAt ? new Date(session.completedAt) : new Date(session.startedAt);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
        <Card className="mb-4" padding="lg">
          <Text className="text-text-primary text-2xl font-bold">{session.sheetName}</Text>

          <View className="mt-3 flex-row items-center">
            <CalendarDays size={16} strokeWidth={ICON_STROKE} color="#7c8aa5" />
            <Text className="ml-2 text-text-secondary text-sm">
              {date.toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>

          <View className="mt-1 flex-row items-center">
            <Clock3 size={16} strokeWidth={ICON_STROKE} color="#7c8aa5" />
            <Text className="ml-2 text-text-muted text-sm">
              {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </Card>

        {session.exercises && session.exercises.length > 0 ? (
          session.exercises.map((exercise) => (
            <Card key={exercise.exerciseId} className="mb-3" padding="md">
              <View className="mb-3 flex-row items-center">
                <Dumbbell size={16} strokeWidth={ICON_STROKE} color="#60a5fa" />
                <Text className="ml-2 text-text-primary text-lg font-bold">{exercise.exerciseName}</Text>
              </View>

              <View className="mb-2 flex-row px-2">
                <Text className="w-12 text-text-muted text-xs font-semibold">SET</Text>
                <Text className="flex-1 text-center text-text-muted text-xs font-semibold">KG</Text>
                <Text className="flex-1 text-center text-text-muted text-xs font-semibold">REPS</Text>
              </View>

              {exercise.sets.map((set, index) => (
                <View
                  key={`${set.exerciseId}-${set.setNumber}`}
                  className={cx(
                    "mb-1 flex-row items-center rounded-lg px-2 py-2",
                    index % 2 === 0 ? "bg-surface-muted" : "bg-surface",
                  )}
                >
                  <Text className="w-12 text-text-secondary text-sm font-semibold">{set.setNumber}</Text>
                  <Text className="flex-1 text-center text-text-primary text-sm font-semibold">{set.weightKg}</Text>
                  <Text className="flex-1 text-center text-text-primary text-sm font-semibold">{set.reps}</Text>
                </View>
              ))}
            </Card>
          ))
        ) : (
          <StateBlock title="No exercises recorded" description="There are no logged sets in this session." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
