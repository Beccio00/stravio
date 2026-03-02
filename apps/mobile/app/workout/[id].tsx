import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSheet, useSession, useLogSessionSet, useCompleteSession } from "../../src/api/hooks";
import { useState, useEffect } from "react";
import type { ExerciseFull, ExerciseSet } from "@bhmt3wp/shared";

// Cross-platform confirm (Alert.alert doesn't work on web)
function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Annulla", style: "cancel" },
      { text: "Conferma", onPress: onConfirm },
    ]);
  }
}

export default function WorkoutScreen() {
  const { id, sheetId } = useLocalSearchParams<{ id: string; sheetId: string }>();
  const sessionId = parseInt(id!);
  const router = useRouter();
  const { data: sheet } = useSheet(parseInt(sheetId!));
  const { data: session } = useSession(sessionId);
  const logSet = useLogSessionSet();
  const completeSession = useCompleteSession();

  // Track completed sets and their actual values
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  // Editable values per set: key = "exerciseId-setNumber"
  const [editValues, setEditValues] = useState<Record<string, { kg: string; reps: string }>>({});
  const [restTimeLeft, setRestTimeLeft] = useState(0);

  // Initialize editable values from sheet template
  useEffect(() => {
    if (!sheet) return;
    const initial: Record<string, { kg: string; reps: string }> = {};
    for (const ex of sheet.exercises) {
      for (const set of ex.sets) {
        const key = `${ex.id}-${set.setNumber}`;
        if (!editValues[key]) {
          initial[key] = {
            kg: set.weightKg.toString(),
            reps: set.reps.toString(),
          };
        }
      }
    }
    if (Object.keys(initial).length > 0) {
      setEditValues((prev) => ({ ...initial, ...prev }));
    }
  }, [sheet]);

  // Rest timer
  useEffect(() => {
    if (restTimeLeft <= 0) return;
    const timer = setTimeout(() => setRestTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [restTimeLeft]);

  const getEditValue = (exerciseId: number, setNumber: number) => {
    const key = `${exerciseId}-${setNumber}`;
    return editValues[key];
  };

  const updateEditValue = (exerciseId: number, setNumber: number, field: "kg" | "reps", value: string) => {
    const key = `${exerciseId}-${setNumber}`;
    setEditValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleCompleteSet = (exercise: ExerciseFull, set: ExerciseSet) => {
    const key = `${exercise.id}-${set.setNumber}`;
    if (completedSets.has(key)) return;

    const values = editValues[key] || { kg: set.weightKg.toString(), reps: set.reps.toString() };
    const actualKg = parseFloat(values.kg) || 0;
    const actualReps = parseInt(values.reps) || 0;

    logSet.mutate({
      sessionId,
      exerciseId: exercise.id,
      setNumber: set.setNumber,
      reps: actualReps,
      weightKg: actualKg,
    });

    setCompletedSets((prev) => new Set(prev).add(key));
    setRestTimeLeft(set.restTimeSec);
  };

  const handleFinishWorkout = () => {
    confirmAction("Completa Allenamento", "Vuoi terminare l'allenamento?", async () => {
      try {
        console.log("Completing session:", sessionId);
        await completeSession.mutateAsync(sessionId);
        console.log("Session completed, navigating home");
        router.replace("/");
      } catch (e: any) {
        const msg = e?.message || String(e);
        console.error("Failed to complete session:", msg);
        if (Platform.OS === "web") {
          window.alert("Errore: " + msg);
        } else {
          Alert.alert("Errore", msg);
        }
      }
    });
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
              const vals = getEditValue(exercise.id, set.setNumber);

              return (
                <View key={set.id} className="flex-row items-center mb-2 px-1">
                  <Text className="text-text-secondary text-sm w-10 font-semibold">
                    {set.setNumber}
                  </Text>

                  {/* Editable KG */}
                  <View className="flex-1 mx-1">
                    <TextInput
                      className={`text-center rounded-lg px-2 py-1 text-sm border ${
                        isDone
                          ? "bg-accent/10 border-accent/30 text-accent"
                          : "bg-surface-light border-border text-text-primary"
                      }`}
                      value={vals?.kg ?? set.weightKg.toString()}
                      onChangeText={(v) => updateEditValue(exercise.id, set.setNumber, "kg", v)}
                      keyboardType="numeric"
                      editable={!isDone}
                      selectTextOnFocus
                    />
                  </View>

                  {/* Editable REPS */}
                  <View className="flex-1 mx-1">
                    <TextInput
                      className={`text-center rounded-lg px-2 py-1 text-sm border ${
                        isDone
                          ? "bg-accent/10 border-accent/30 text-accent"
                          : "bg-surface-light border-border text-text-primary"
                      }`}
                      value={vals?.reps ?? set.reps.toString()}
                      onChangeText={(v) => updateEditValue(exercise.id, set.setNumber, "reps", v)}
                      keyboardType="numeric"
                      editable={!isDone}
                      selectTextOnFocus
                    />
                  </View>

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
