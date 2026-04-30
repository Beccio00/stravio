import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useSheet,
  useUpdateSheet,
  useCreateExercise,
  useDeleteExercise,
  useUpdateExercise,
  useCreateSet,
  useUpdateSet,
  useDeleteSet,
  useCreateSession,
  useReorderExercises,
} from "../../src/api/hooks";
import type { ExerciseFull, ExerciseSet } from "@bhmt3wp/shared";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import type { RenderItemParams } from "react-native-draggable-flatlist";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
import { cssInterop } from "nativewind";
import {
  Check,
  GripVertical,
  NotebookPen,
  PencilLine,
  Play,
  Plus,
  Trash2,
} from "lucide-react-native";
import {
  Button,
  Card,
  ICON_SIZE,
  ICON_STROKE,
  Input,
  ScreenHeader,
  StateBlock,
  cx,
} from "../../src/components/ui";

cssInterop(GHTouchableOpacity, { className: "style" });

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
  const updateSheet = useUpdateSheet();
  const reorderExercises = useReorderExercises(sheetId);

  const [newExerciseName, setNewExerciseName] = useState("");
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [isEditingSheetName, setIsEditingSheetName] = useState(false);
  const [sheetNameDraft, setSheetNameDraft] = useState("");
  const [exerciseList, setExerciseList] = useState<ExerciseFull[]>([]);

  useEffect(() => {
    if (sheet) setExerciseList(sheet.exercises);
  }, [sheet]);

  const beginEditSheetName = () => {
    setSheetNameDraft(sheet?.name ?? "");
    setIsEditingSheetName(true);
  };

  const applySheetName = () => {
    if (!sheet) return;

    const trimmed = sheetNameDraft.trim();
    if (!trimmed) return;
    if (trimmed === sheet.name) {
      setIsEditingSheetName(false);
      return;
    }

    updateSheet.mutate(
      { id: sheetId, name: trimmed },
      {
        onSuccess: () => setIsEditingSheetName(false),
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Could not rename sheet";
          if (Platform.OS === "web") {
            window.alert(msg);
          } else {
            Alert.alert("Rename failed", msg);
          }
        },
      },
    );
  };

  const handleAddExercise = () => {
    if (!newExerciseName.trim()) return;

    createExercise.mutate(
      {
        sheetId,
        name: newExerciseName.trim(),
        orderIndex: sheet?.exercises.length ?? 0,
      },
      {
        onSuccess: () => {
          setNewExerciseName("");
          setShowAddExercise(false);
        },
      },
    );
  };

  const handleDeleteExercise = (exerciseId: string, name: string) => {
    const title = "Delete exercise";
    const message = `Delete \"${name}\" from this sheet?`;

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) {
        deleteExercise.mutate(exerciseId);
      }
    } else {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteExercise.mutate(exerciseId) },
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
      },
    );
  };

  const renderExercise = ({ item: exercise, drag, isActive }: RenderItemParams<ExerciseFull>) => (
    <ScaleDecorator>
      <ExerciseCard
        exercise={exercise}
        isActive={isActive}
        drag={drag}
        isPendingReorder={reorderExercises.isPending}
        onDelete={() => handleDeleteExercise(exercise.id, exercise.name)}
        onUpdateExercise={(data) => updateExercise.mutate({ id: exercise.id, ...data })}
        onAddSet={() => handleAddSet(exercise.id, exercise.sets)}
        onUpdateSet={(setId, data) => updateSet.mutate({ id: setId, ...data })}
        onDeleteSet={(setId) => deleteSet.mutate(setId)}
      />
    </ScaleDecorator>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background px-5 pt-8" edges={["bottom"]}>
        <StateBlock title="Loading sheet" description="Preparing your exercises and sets." />
      </SafeAreaView>
    );
  }

  if (!sheet) {
    return (
      <SafeAreaView className="flex-1 bg-background px-5 pt-8" edges={["bottom"]}>
        <StateBlock
          title="Sheet not found"
          description="This sheet might have been removed."
          tone="danger"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <DraggableFlatList
        data={exerciseList}
        keyExtractor={(item) => item.id}
        renderItem={renderExercise}
        onDragEnd={({ data, from, to }) => {
          setExerciseList(data);
          if (from !== to) reorderExercises.mutate(data.map((exercise) => exercise.id));
        }}
        ListHeaderComponent={
          <View className="px-5 pt-3 pb-3">
            <ScreenHeader
              title={sheet.name}
              subtitle="Plan your sets, then start the session when ready."
              rightAction={
                <Button
                  label="Start"
                  icon={Play}
                  size="sm"
                  onPress={handleStartWorkout}
                  loading={createSession.isPending}
                />
              }
            />

            {isEditingSheetName ? (
              <View className="mt-4 flex-row items-center">
                <Input
                  value={sheetNameDraft}
                  onChangeText={setSheetNameDraft}
                  placeholder="Sheet name"
                  editable={!updateSheet.isPending}
                  onSubmitEditing={applySheetName}
                  containerClassName="flex-1"
                  inputClassName="text-xl font-bold"
                  returnKeyType="done"
                  autoFocus
                />
                <TouchableOpacity
                  onPress={applySheetName}
                  disabled={updateSheet.isPending}
                  className="ml-2 h-11 w-11 items-center justify-center rounded-xl bg-action-secondary border border-border"
                  accessibilityLabel="Save sheet name"
                >
                  <Check size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#22c55e" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={beginEditSheetName}
                className="mt-4 flex-row items-center self-start rounded-xl border border-border bg-action-secondary px-3 py-2"
                accessibilityRole="button"
                accessibilityLabel="Rename sheet"
              >
                <PencilLine size={16} strokeWidth={ICON_STROKE} color="#c0c9d8" />
                <Text className="ml-2 text-text-secondary text-sm font-semibold">Rename sheet</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          <View className="px-5 pb-4">
            {showAddExercise ? (
              <Card padding="lg" className="mb-3">
                <Text className="text-text-primary text-lg font-bold">Add exercise</Text>
                <Text className="text-text-secondary text-sm mt-1">
                  Add one movement at a time, then fill your set template.
                </Text>

                <Input
                  value={newExerciseName}
                  onChangeText={setNewExerciseName}
                  placeholder="Example: Incline dumbbell press"
                  onSubmitEditing={handleAddExercise}
                  containerClassName="mt-4"
                  autoFocus
                  returnKeyType="done"
                />

                <View className="mt-4 flex-row gap-3">
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={() => setShowAddExercise(false)}
                    className="flex-1"
                  />
                  <Button
                    label="Add"
                    icon={Plus}
                    onPress={handleAddExercise}
                    className="flex-1"
                    loading={createExercise.isPending}
                  />
                </View>
              </Card>
            ) : (
              <Button
                label="Add exercise"
                icon={Plus}
                variant="secondary"
                onPress={() => setShowAddExercise(true)}
                className="mb-3"
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="px-5 py-4">
            <StateBlock
              title="No exercises yet"
              description="Add your first exercise to start building this sheet."
              actionLabel="Add exercise"
              onAction={() => setShowAddExercise(true)}
            />
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />
    </SafeAreaView>
  );
}

function ExerciseCard({
  exercise,
  isActive,
  drag,
  isPendingReorder,
  onDelete,
  onUpdateExercise,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
}: {
  exercise: ExerciseFull;
  isActive: boolean;
  drag: () => void;
  isPendingReorder: boolean;
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
    <View className="px-5">
      <Card className={cx("mb-3", isActive && "opacity-90")} padding="md">
        <View className="mb-3 flex-row items-center">
          <GHTouchableOpacity
            onLongPress={drag}
            delayLongPress={180}
            disabled={isPendingReorder}
            className="mr-1 h-9 w-8 items-center justify-center"
            accessibilityLabel="Hold and drag to reorder exercise"
            accessibilityRole="button"
          >
            <GripVertical size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#7c8aa5" />
          </GHTouchableOpacity>

          <Text className="flex-1 text-text-primary text-lg font-bold">{exercise.name}</Text>

          <TouchableOpacity
            onPress={onDelete}
            className="h-9 w-9 items-center justify-center rounded-xl bg-danger/15 border border-danger/30"
            accessibilityRole="button"
            accessibilityLabel={`Delete ${exercise.name}`}
          >
            <Trash2 size={16} strokeWidth={ICON_STROKE} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {isEditingNotes ? (
          <Input
            value={notes}
            onChangeText={setNotes}
            onBlur={handleBlurNotes}
            leftIcon={NotebookPen}
            placeholder="Add cues, tempo, or setup reminders"
            multiline
            autoFocus
            containerClassName="mb-3"
          />
        ) : (
          <TouchableOpacity
            className="mb-3 rounded-xl border border-border bg-surface-muted px-3 py-3"
            onPress={() => setIsEditingNotes(true)}
          >
            <View className="flex-row items-start">
              <NotebookPen size={16} strokeWidth={ICON_STROKE} color="#7c8aa5" />
              <Text className="ml-2 flex-1 text-sm text-text-muted">
                {exercise.notes || "Add exercise notes (tempo, setup, focus cues)."}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {exercise.sets.length > 0 ? (
          <View className="mb-2 flex-row px-1">
            <Text className="w-10 text-text-muted text-xs font-semibold">SET</Text>
            <Text className="flex-1 text-center text-text-muted text-xs font-semibold">KG</Text>
            <Text className="flex-1 text-center text-text-muted text-xs font-semibold">REPS</Text>
            <Text className="flex-1 text-center text-text-muted text-xs font-semibold">REST</Text>
            <View className="w-8" />
          </View>
        ) : null}

        {exercise.sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            onUpdate={(data) => onUpdateSet(set.id, data)}
            onDelete={() => onDeleteSet(set.id)}
          />
        ))}

        <Button
          label="Add set"
          icon={Plus}
          variant="secondary"
          size="sm"
          onPress={onAddSet}
          className="mt-2"
        />
      </Card>
    </View>
  );
}

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
    const nextReps = parseInt(values.reps, 10) || 0;
    const nextRest = parseInt(values.rest, 10) || 60;

    if (nextWeight === set.weightKg && nextReps === set.reps && nextRest === set.restTimeSec) {
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
        saveIfChanged({ kg: latest.kg, reps: latest.reps, rest: latest.rest });
      }
    };
  }, [set.weightKg, set.reps, set.restTimeSec]);

  if (isEditing) {
    return (
      <View className="mb-2 flex-row items-center rounded-xl bg-surface-muted px-2 py-2">
        <Text className="w-10 text-text-secondary text-sm font-semibold">{set.setNumber}</Text>

        <TextInput
          className="mx-1 flex-1 rounded-lg border border-border bg-surface-light px-2 py-1 text-center text-text-primary text-sm"
          value={kg}
          onChangeText={setKg}
          keyboardType="numeric"
          autoFocus
        />
        <TextInput
          className="mx-1 flex-1 rounded-lg border border-border bg-surface-light px-2 py-1 text-center text-text-primary text-sm"
          value={reps}
          onChangeText={setReps}
          keyboardType="numeric"
        />
        <TextInput
          className="mx-1 flex-1 rounded-lg border border-border bg-surface-light px-2 py-1 text-center text-text-primary text-sm"
          value={rest}
          onChangeText={setRest}
          keyboardType="numeric"
        />

        <TouchableOpacity onPress={handleSave} className="w-8 items-center" accessibilityLabel="Save set values">
          <Check size={16} strokeWidth={ICON_STROKE} color="#22c55e" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      className={cx(
        "mb-2 flex-row items-center rounded-xl px-2 py-2",
        set.setNumber % 2 === 0 ? "bg-surface-muted" : "bg-surface",
      )}
    >
      <TouchableOpacity
        className="flex-1 flex-row items-center"
        onPress={() => setIsEditing(true)}
        accessibilityRole="button"
        accessibilityLabel={`Edit set ${set.setNumber}`}
      >
        <Text className="w-10 text-text-secondary text-sm font-semibold">{set.setNumber}</Text>
        <Text className="flex-1 text-center text-text-primary text-sm">{set.weightKg}</Text>
        <Text className="flex-1 text-center text-text-primary text-sm">{set.reps}</Text>
        <Text className="flex-1 text-center text-text-muted text-sm">{set.restTimeSec}s</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="w-8 items-center"
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete set ${set.setNumber}`}
      >
        <Trash2 size={14} strokeWidth={ICON_STROKE} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}
