import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useSheet,
  useCreateExercise,
  useDeleteExercise,
  useUpdateExercise,
  useCreateSet,
  useUpdateSet,
  useDeleteSet,
  useCreateSession,
} from "../../src/api/hooks";
import { useEffect, useRef, useState } from "react";
import type { ExerciseFull, ExerciseSet } from "@bhmt3wp/shared";

export default function SheetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sheetId = id!;
  const router = useRouter();
  const { data: sheet, isLoading } = useSheet(sheetId);
  const createExercise = useCreateExercise();
  const deleteExercise = useDeleteExercise(sheetId);
  const updateExercise = useUpdateExercise(sheetId);
  const createSet = useCreateSet(sheetId);
  const updateSet = useUpdateSet(sheetId);
  const deleteSet = useDeleteSet(sheetId);
  const createSession = useCreateSession();

  const [newExerciseName, setNewExerciseName] = useState("");
  const [showAddExercise, setShowAddExercise] = useState(false);

  const handleAddExercise = () => {
    if (!newExerciseName.trim()) return;
    createExercise.mutate(
      {
        sheetId,
        name: newExerciseName.trim(),
        orderIndex: (sheet?.exercises.length ?? 0),
      },
      {
        onSuccess: () => {
          setNewExerciseName("");
          setShowAddExercise(false);
        },
      }
    );
  };

  const handleDeleteExercise = (exId: string, name: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${name}"?`)) {
        deleteExercise.mutate(exId);
      }
    } else {
      Alert.alert("Delete exercise", `Delete "${name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteExercise.mutate(exId) },
      ]);
    }
  };

  const handleAddSet = (exerciseId: string, currentSets: ExerciseSet[]) => {
    const nextSetNumber = currentSets.length + 1;
    const lastSet = currentSets[currentSets.length - 1];
    createSet.mutate({
      exerciseId,
      setNumber: nextSetNumber,
      reps: lastSet?.reps ?? 10,
      weightKg: lastSet?.weightKg ?? 0,
      restTimeSec: lastSet?.restTimeSec ?? 60,
    });
  };

  const handleStartWorkout = () => {
    createSession.mutate(
      { sheetId },
      {
        onSuccess: (session) => {
          router.push(`/workout/${session.id}?sheetId=${sheetId}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-secondary text-lg">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!sheet) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-danger text-lg">Sheet not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <View className="flex-1">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-primary text-base mb-1">← Back</Text>
          </TouchableOpacity>
          <Text className="text-text-primary text-2xl font-bold">{sheet.name}</Text>
          {sheet.description && (
            <Text className="text-text-secondary mt-1">{sheet.description}</Text>
          )}
        </View>
        <TouchableOpacity
          className="bg-accent px-5 py-3 rounded-xl"
          onPress={handleStartWorkout}
        >
          <Text className="text-background font-bold text-base">▶ Start</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        {sheet.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onDelete={() => handleDeleteExercise(exercise.id, exercise.name)}
            onUpdateExercise={(data) => updateExercise.mutate({ id: exercise.id, ...data })}
            onAddSet={() => handleAddSet(exercise.id, exercise.sets)}
            onUpdateSet={(setId, data) => updateSet.mutate({ id: setId, ...data })}
            onDeleteSet={(setId) => deleteSet.mutate(setId)}
          />
        ))}

        {/* Add exercise */}
        {showAddExercise ? (
          <View className="bg-surface rounded-2xl p-4 mb-3 border border-border">
            <TextInput
              className="bg-background text-text-primary rounded-xl px-4 py-3 text-base border border-border mb-3"
            placeholder="Exercise name..."
              placeholderTextColor="#6b6b7b"
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              autoFocus
              onSubmitEditing={handleAddExercise}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-background rounded-xl py-3 items-center"
                onPress={() => setShowAddExercise(false)}
              >
                <Text className="text-text-secondary font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary rounded-xl py-3 items-center"
                onPress={handleAddExercise}
              >
                <Text className="text-white font-semibold">Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            className="bg-surface-light rounded-2xl p-4 mb-3 border border-border border-dashed items-center"
            onPress={() => setShowAddExercise(true)}
          >
            <Text className="text-primary font-semibold text-base">+ Add Exercise</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Exercise Card Component ----
function ExerciseCard({
  exercise,
  onDelete,
  onUpdateExercise,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
}: {
  exercise: ExerciseFull;
  onDelete: () => void;
  onUpdateExercise: (data: { notes?: string }) => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, data: { reps?: number; weightKg?: number; restTimeSec?: number }) => void;
  onDeleteSet: (setId: string) => void;
}) {
  const [notes, setNotes] = useState(exercise.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const handleBlurNotes = () => {
    const trimmedNotes = notes.trim();
    if (trimmedNotes !== (exercise.notes || "")) {
      onUpdateExercise({ notes: trimmedNotes || undefined });
    }
    setIsEditingNotes(false);
  };

  return (
    <View className="bg-surface rounded-2xl p-4 mb-3 border border-border">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-text-primary text-lg font-bold flex-1">{exercise.name}</Text>
        <TouchableOpacity onPress={onDelete}>
          <Text className="text-danger text-sm">Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise Notes */}
      {isEditingNotes ? (
        <TextInput
          className="bg-background border border-border rounded-lg px-3 py-2 text-text-primary text-sm mb-3"
          placeholder="Add notes for this exercise..."
          placeholderTextColor="#999"
          value={notes}
          onChangeText={setNotes}
          onBlur={handleBlurNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          autoFocus
        />
      ) : (
        <TouchableOpacity
          className="mb-3"
          onPress={() => setIsEditingNotes(true)}
        >
          {exercise.notes ? (
            <Text className="text-text-muted text-sm">{exercise.notes}</Text>
          ) : (
            <Text className="text-text-muted text-sm italic">Tap to add notes...</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Sets header */}
      {exercise.sets.length > 0 && (
        <View className="flex-row mb-2 px-1">
          <Text className="text-text-muted text-xs w-10">SET</Text>
          <Text className="text-text-muted text-xs flex-1 text-center">KG</Text>
          <Text className="text-text-muted text-xs flex-1 text-center">REPS</Text>
          <Text className="text-text-muted text-xs flex-1 text-center">REST</Text>
          <View className="w-8" />
        </View>
      )}

      {/* Sets */}
      {exercise.sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          onUpdate={(data) => onUpdateSet(set.id, data)}
          onDelete={() => onDeleteSet(set.id)}
        />
      ))}

      <TouchableOpacity
        className="bg-surface-light rounded-xl py-2 mt-2 items-center"
        onPress={onAddSet}
      >
        <Text className="text-primary-light font-semibold text-sm">+ Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Set Row Component ----
function SetRow({
  set,
  onUpdate,
  onDelete,
}: {
  set: ExerciseSet;
  onUpdate: (data: { reps?: number; weightKg?: number; restTimeSec?: number }) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [kg, setKg] = useState(set.weightKg.toString());
  const [reps, setReps] = useState(set.reps.toString());
  const [rest, setRest] = useState(set.restTimeSec.toString());

  const latestRef = useRef({ kg, reps, rest, isEditing });

  useEffect(() => {
    latestRef.current = { kg, reps, rest, isEditing };
  }, [kg, reps, rest, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setKg(set.weightKg.toString());
      setReps(set.reps.toString());
      setRest(set.restTimeSec.toString());
    }
  }, [set.weightKg, set.reps, set.restTimeSec, isEditing]);

  const saveIfChanged = (values: { kg: string; reps: string; rest: string }) => {
    const nextWeight = parseFloat(values.kg) || 0;
    const nextReps = parseInt(values.reps) || 0;
    const nextRest = parseInt(values.rest) || 60;

    if (
      nextWeight === set.weightKg &&
      nextReps === set.reps &&
      nextRest === set.restTimeSec
    ) {
      return;
    }

    onUpdate({
      weightKg: nextWeight,
      reps: nextReps,
      restTimeSec: nextRest,
    });
  };

  const handleSave = () => {
    saveIfChanged({ kg, reps, rest });
    setIsEditing(false);
  };

  useEffect(() => {
    return () => {
      const latest = latestRef.current;
      if (latest.isEditing) {
        saveIfChanged({
          kg: latest.kg,
          reps: latest.reps,
          rest: latest.rest,
        });
      }
    };
  }, [set.weightKg, set.reps, set.restTimeSec]);

  if (isEditing) {
    return (
      <View className="flex-row items-center mb-2 px-1">
        <Text className="text-text-secondary text-sm w-10">{set.setNumber}</Text>
        <TextInput
          className="flex-1 bg-background text-text-primary rounded-lg px-2 py-1 text-center mx-1 border border-border"
          value={kg}
          onChangeText={setKg}
          keyboardType="numeric"
          autoFocus
        />
        <TextInput
          className="flex-1 bg-background text-text-primary rounded-lg px-2 py-1 text-center mx-1 border border-border"
          value={reps}
          onChangeText={setReps}
          keyboardType="numeric"
        />
        <TextInput
          className="flex-1 bg-background text-text-primary rounded-lg px-2 py-1 text-center mx-1 border border-border"
          value={rest}
          onChangeText={setRest}
          keyboardType="numeric"
        />
        <TouchableOpacity onPress={handleSave} className="w-8 items-center">
          <Text className="text-accent text-sm">✓</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      className="flex-row items-center mb-2 px-1 py-1"
      onPress={() => setIsEditing(true)}
      onLongPress={onDelete}
    >
      <Text className="text-text-secondary text-sm w-10 font-semibold">{set.setNumber}</Text>
      <Text className="text-text-primary text-sm flex-1 text-center">{set.weightKg}</Text>
      <Text className="text-text-primary text-sm flex-1 text-center">{set.reps}</Text>
      <Text className="text-text-muted text-sm flex-1 text-center">{set.restTimeSec}s</Text>
      <View className="w-8" />
    </TouchableOpacity>
  );
}
