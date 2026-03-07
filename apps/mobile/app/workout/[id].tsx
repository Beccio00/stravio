import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSheet, useSession, useLogSessionSet, useCompleteSession, useLastSessionBySheet, useUpdateSet, useSessionExerciseNotes, useUpsertExerciseNote } from "../../src/api/hooks";
import { useState, useEffect, useMemo } from "react";
import type { ExerciseFull, ExerciseSet, SessionSetLog } from "@bhmt3wp/shared";

// Cross-platform confirm (Alert.alert doesn't work on web)
function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: onConfirm },
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
  const updateSet = useUpdateSet(parseInt(sheetId!));
  const { data: lastSessionData } = useLastSessionBySheet(parseInt(sheetId!));
  const { data: exerciseNotes } = useSessionExerciseNotes(sessionId);
  const upsertNote = useUpsertExerciseNote();

  // Build lookup: "exerciseId-setNumber" → previous log
  const prevLogs = useMemo(() => {
    const map: Record<string, SessionSetLog> = {};
    if (lastSessionData?.logs) {
      for (const log of lastSessionData.logs) {
        map[`${log.exerciseId}-${log.setNumber}`] = log;
      }
    }
    return map;
  }, [lastSessionData]);

  // Track completed sets and their actual values
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  // Editable values per set: key = "exerciseId-setNumber"
  const [editValues, setEditValues] = useState<Record<string, { kg: string; reps: string }>>({});
  // Exercise notes: key = exerciseId
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
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

  // Load existing exercise notes
  useEffect(() => {
    if (!exerciseNotes) return;
    const notesMap: Record<number, string> = {};
    for (const note of exerciseNotes) {
      notesMap[note.exerciseId] = note.notes;
    }
    setNotes(notesMap);
  }, [exerciseNotes]);

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

  const updateExerciseNote = (exerciseId: number, text: string) => {
    setNotes((prev) => ({ ...prev, [exerciseId]: text }));
  };

  const handleBlurNote = (exerciseId: number) => {
    const noteText = notes[exerciseId] || "";
    const trimmedNote = noteText.trim();
    // Save to backend
    upsertNote.mutate({
      sessionId,
      exerciseId,
      notes: trimmedNote,
    });
    setEditingNoteId(null);
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

    // Sync KG change back to the sheet template (reps stay session-only)
    if (actualKg !== set.weightKg) {
      updateSet.mutate({ id: set.id, weightKg: actualKg });
    }

    setCompletedSets((prev) => new Set(prev).add(key));
    setRestTimeLeft(set.restTimeSec);
  };

  const handleFinishWorkout = () => {
    // Validate that at least one set is completed
    if (completedSets.size === 0) {
      const msg = "You must complete at least one set before finishing the workout.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Cannot Finish", msg);
      }
      return;
    }

    confirmAction("Complete Workout", "Do you want to finish the workout?", async () => {
      try {
        console.log("Completing session:", sessionId);
        await completeSession.mutateAsync(sessionId);
        console.log("Session completed, navigating home");
        // Dismiss all intermediate screens (sheet) then replace with root
        if (router.canDismiss()) {
          router.dismissAll();
        }
        router.replace("/");
      } catch (e: any) {
        const msg = e?.message || String(e);
        console.error("Failed to complete session:", msg);
        if (Platform.OS === "web") {
          window.alert("Error: " + msg);
        } else {
          Alert.alert("Error", msg);
        }
      }
    });
  };

  if (!sheet) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary text-lg">Loading...</Text>
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
            <Text className="text-accent text-sm font-semibold uppercase">Workout in progress</Text>
            <Text className="text-text-primary text-xl font-bold">{sheet.name}</Text>
          </View>
          <TouchableOpacity
            className="bg-danger px-4 py-2 rounded-xl"
            onPress={handleFinishWorkout}
          >
            <Text className="text-white font-bold">Finish</Text>
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
          {completedCount}/{totalSets} sets completed
        </Text>
      </View>

      {/* Rest Timer */}
      {restTimeLeft > 0 && (
        <View className="mx-5 bg-primary/20 rounded-2xl p-4 mb-3 items-center">
          <Text className="text-primary-light text-sm font-semibold">REST</Text>
          <Text className="text-text-primary text-4xl font-bold">
            {Math.floor(restTimeLeft / 60)}:{(restTimeLeft % 60).toString().padStart(2, "0")}
          </Text>
          <TouchableOpacity onPress={() => setRestTimeLeft(0)} className="mt-2">
            <Text className="text-primary text-sm">Skip →</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {sheet.exercises.map((exercise) => (
          <View key={exercise.id} className="bg-surface rounded-2xl p-4 mb-3 border border-border">
            <Text className="text-text-primary text-lg font-bold mb-2">{exercise.name}</Text>

            {/* Exercise Notes */}
            {editingNoteId === exercise.id ? (
              <TextInput
                className="bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm mb-3"
                placeholder="Add notes for this exercise..."
                placeholderTextColor="#999"
                value={notes[exercise.id] || ""}
                onChangeText={(text) => updateExerciseNote(exercise.id, text)}
                onBlur={() => handleBlurNote(exercise.id)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoFocus
              />
            ) : (
              <TouchableOpacity
                className="mb-3"
                onPress={() => setEditingNoteId(exercise.id)}
              >
                {notes[exercise.id] ? (
                  <Text className="text-text-muted text-sm">{notes[exercise.id]}</Text>
                ) : (
                  <Text className="text-text-muted text-sm italic">Tap to add notes...</Text>
                )}
              </TouchableOpacity>
            )}

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
              const prev = prevLogs[key];

              return (
                <View key={set.id} className="mb-2 px-1">
                  <View className="flex-row items-center">
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
                        {isDone ? "✓ Done" : "Done"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Previous session hint */}
                  {prev && (
                    <Text className="text-text-muted text-xs ml-10 mt-0.5">
                      last time: {prev.weightKg}kg × {prev.reps}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
