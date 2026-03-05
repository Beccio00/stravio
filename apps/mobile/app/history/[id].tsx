import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native";
import { useSession } from "../../src/api/hooks";

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = parseInt(id!);
  const router = useRouter();
  const { data: session, isLoading } = useSession(sessionId);

  if (isLoading || !session) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary text-lg">Loading...</Text>
      </SafeAreaView>
    );
  }

  const date = session.completedAt
    ? new Date(session.completedAt)
    : new Date(session.startedAt);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.navigate("/history")}>
          <Text className="text-primary text-base mb-1">← Back</Text>
        </TouchableOpacity>
        <Text className="text-text-primary text-2xl font-bold">{session.sheetName}</Text>
        <Text className="text-text-muted text-sm mt-1">
          {date.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {" · "}
          {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {session.exercises && session.exercises.length > 0 ? (
          session.exercises.map((exercise) => (
            <View
              key={exercise.exerciseId}
              className="bg-surface rounded-2xl p-4 mb-3 border border-border"
            >
              <Text className="text-text-primary text-lg font-bold mb-3">
                {exercise.exerciseName}
              </Text>

              {/* Header */}
              <View className="flex-row mb-2 px-1">
                <Text className="text-text-muted text-xs w-12">SET</Text>
                <Text className="text-text-muted text-xs flex-1 text-center">KG</Text>
                <Text className="text-text-muted text-xs flex-1 text-center">REPS</Text>
              </View>

              {exercise.sets.map((set) => (
                <View
                  key={`${set.exerciseId}-${set.setNumber}`}
                  className="flex-row items-center mb-2 px-1"
                >
                  <Text className="text-text-secondary text-sm w-12 font-semibold">
                    {set.setNumber}
                  </Text>
                  <Text className="text-accent text-sm flex-1 text-center font-semibold">
                    {set.weightKg}
                  </Text>
                  <Text className="text-accent text-sm flex-1 text-center font-semibold">
                    {set.reps}
                  </Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View className="items-center justify-center pt-10">
            <Text className="text-text-muted text-base">No exercises recorded</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
