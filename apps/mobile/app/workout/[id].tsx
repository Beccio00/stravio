import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSheet, useSession, useLogSessionSet, useCompleteSession } from "../../src/api/hooks";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ExerciseFull, ExerciseSet } from "@bhmt3wp/shared";

export default function WorkoutScreen() {
  const { id, sheetId } = useLocalSearchParams<{ id: string; sheetId: string }>();
  const sessionId = parseInt(id!);
  const router = useRouter();
  const { data: sheet } = useSheet(parseInt(sheetId!));
  const { data: session } = useSession(sessionId);
  const logSet = useLogSessionSet();
  const completeSession = useCompleteSession();

  // Track which sets have been completed
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [activeRestTimer, setActiveRestTimer] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);

  // Rest timer
  useEffect(() => {
    if (restTimeLeft <= 0) {
      setActiveRestTimer(null);
      return;
    }
    const timer = setTimeout(() => setRestTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [restTimeLeft]);

  const handleCompleteSet = (exercise: ExerciseFull, set: ExerciseSet) => {
    const key = `${exercise.id}-${set.setNumber}`;
    if (completedSets.has(key)) return;

    logSet.mutate({
      sessionId,
      exerciseId: exercise.id,
      setNumber: set.setNumber,
      reps: set.reps,
      weightKg: set.weightKg,
    });

    setCompletedSets((prev) => new Set(prev).add(key));
    setActiveRestTimer(set.id);
    setRestTimeLeft(set.restTimeSec);
  };

  const handleFinishWorkout = () => {
    Alert.alert("Completa Allenamento", "Vuoi terminare l'allenamento?", [
      { text: "Continua", style: "cancel" },
      {
        text: "Completa",
        onPress: () => {
          completeSession.mutate(sessionId, {
            onSuccess: () => router.replace("/"),
          });
        },
      },
    ]);
  };

  if (!sheet) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary text-lg">Caricamento...</Text>
      </SafeAreaView>
    );
  }

  const totalSets = sheet.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedCount = completedSets.size;
  const progress = totalSets > 0 ? (completedCount / totalSets) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-accent text-sm font-semibold uppercase">Allenamento in corso</Text>
            <Text className="text-text-primary text-xl font-bold">{sheet.name}</Text>
          </View>
          <TouchableOpacity
            className="bg-danger px-4 py-2 rounded-xl"
            onPress={handleFinishWorkout}
          >
            <Text className="text-white font-bold">Finisci</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View className="bg-surface-light rounded-full h-2 mt-3">
          <View
            className="bg-accent rounded-full h-2"
            style={{ width: `${progress}%` }}
          />
        </View>
        <Text className="text-text-muted text-xs mt-1">
          {completedCount}/{totalSets} set completati
        </Text>
      </View>

      {/* Rest Timer */}
      {restTimeLeft > 0 && (
        <View className="mx-5 bg-primary/20 rounded-2xl p-4 mb-3 items-center">
          <Text className="text-primary-light text-sm font-semibold">RIPOSO</Text>
          <Text className="text-text-primary text-4xl font-bold">
            {Math.floor(restTimeLeft / 60)}:{(restTimeLeft % 60).toString().padStart(2, "0")}
          </Text>
          <TouchableOpacity onPress={() => setRestTimeLeft(0)} className="mt-2">
            <Text className="text-primary text-sm">Salta →</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {sheet.exercises.map((exercise) => (
          <View key={exercise.id} className="bg-surface rounded-2xl p-4 mb-3 border border-border">
            <Text className="text-text-primary text-lg font-bold mb-3">{exercise.name}</Text>

            {/* Set header */}
            <View className="flex-row mb-2 px-1">
              <Text className="text-text-muted text-xs w-10">SET</Text>
              <Text className="text-text-muted text-xs flex-1 text-center">KG</Text>
              <Text className="text-text-muted text-xs flex-1 text-center">REPS</Text>
              <View className="w-20" />
            </View>

            {exercise.sets.map((set) => {
              const key = `${exercise.id}-${set.setNumber}`;
              const isDone = completedSets.has(key);

              return (
                <View key={set.id} className="flex-row items-center mb-2 px-1">
                  <Text className="text-text-secondary text-sm w-10 font-semibold">
                    {set.setNumber}
                  </Text>
                  <Text className="text-text-primary text-sm flex-1 text-center">
                    {set.weightKg} kg
                  </Text>
                  <Text className="text-text-primary text-sm flex-1 text-center">
                    {set.reps}
                  </Text>
                  <TouchableOpacity
                    className={`w-20 py-2 rounded-xl items-center ${
                      isDone ? "bg-accent/20" : "bg-primary"
                    }`}
                    onPress={() => handleCompleteSet(exercise, set)}
                    disabled={isDone}
                  >
                    <Text
                      className={`font-semibold text-sm ${
                        isDone ? "text-accent" : "text-white"
                      }`}
                    >
                      {isDone ? "✓ Fatto" : "Fatto"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
