import { useMemo, useState } from "react";
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PencilLine, Play, Plus, Trash2 } from "lucide-react-native";
import type { CatalogExercise } from "@bhmt3wp/shared";
import {
  useCreateSession,
  useDeleteExercise,
  useIncompleteSession,
  useSheet,
  useUpdateSheet,
} from "../../src/api/hooks";
import { ExercisePicker } from "../../src/components/ExercisePicker";
import { addCatalogExerciseToSheet } from "../../src/lib/addCatalogExercise";
import { isFreestyleSheetName } from "../../src/lib/ensureFreestyleSheet";
import {
  Button,
  Card,
  ICON_STROKE,
  Input,
  StateBlock,
} from "../../src/components/ui";

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sheetId = id!;
  const router = useRouter();
  const { data: sheet, isLoading, refetch } = useSheet(sheetId);
  const updateSheet = useUpdateSheet();
  const deleteExercise = useDeleteExercise(sheetId);
  const createSession = useCreateSession();
  const { data: incompleteSession } = useIncompleteSession(sheetId);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const existingNames = useMemo(
    () => (sheet?.exercises ?? []).map((exercise) => exercise.name),
    [sheet?.exercises],
  );

  const beginRename = () => {
    setNameDraft(sheet?.name ?? "");
    setIsEditingName(true);
  };

  const applyRename = () => {
    if (!sheet) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === sheet.name) {
      setIsEditingName(false);
      return;
    }
    if (isFreestyleSheetName(trimmed)) {
      const msg = "Nazwa „Freestyle” jest zarezerwowana.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Nie można zmienić nazwy", msg);
      return;
    }
    updateSheet.mutate(
      { id: sheetId, name: trimmed },
      {
        onSuccess: () => setIsEditingName(false),
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Nie można zmienić nazwy";
          if (Platform.OS === "web") window.alert(msg);
          else Alert.alert("Błąd", msg);
        },
      },
    );
  };

  const handleAdd = async (exercise: CatalogExercise | { name: string; timeBased?: boolean }) => {
    if (!sheet) return;
    setIsAdding(true);
    try {
      await addCatalogExerciseToSheet(sheetId, exercise, sheet.exercises.length, { setCount: 0 });
      setShowPicker(false);
      await refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nie można dodać ćwiczenia";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Błąd", msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteExercise = (exerciseId: string, name: string) => {
    const title = "Usuń z planu";
    const message = `Usunąć „${name}” z tego układu?`;
    const run = () => deleteExercise.mutate(exerciseId);
    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) run();
    } else {
      Alert.alert(title, message, [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń", style: "destructive", onPress: run },
      ]);
    }
  };

  const handleStart = () => {
    if (!sheet) return;
    if (sheet.exercises.length === 0) {
      const msg = "Dodaj przynajmniej jedno ćwiczenie z katalogu, zanim zaczniesz.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Pusty plan", msg);
      return;
    }

    if (incompleteSession) {
      router.push(`/workout/${incompleteSession.id}?sheetId=${sheetId}`);
      return;
    }

    setIsStarting(true);
    createSession.mutate(
      { sheetId },
      {
        onSuccess: (session) => {
          router.push(`/workout/${session.id}?sheetId=${sheetId}`);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Nie można rozpocząć treningu";
          if (Platform.OS === "web") window.alert(msg);
          else Alert.alert("Błąd", msg);
        },
        onSettled: () => setIsStarting(false),
      },
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background px-5 pt-8">
        <StateBlock title="Wczytywanie planu" description="Przygotowywanie listy ćwiczeń." />
      </View>
    );
  }

  if (!sheet || isFreestyleSheetName(sheet.name)) {
    return (
      <View className="flex-1 bg-background px-5 pt-8">
        <StateBlock
          title="Nie znaleziono planu"
          description="Ten układ mógł zostać usunięty albo to arkusz freestyle."
          tone="danger"
          actionLabel="Wróć do planów"
          onAction={() => router.replace("/plans")}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        {isEditingName ? (
          <View className="flex-row items-center mb-3">
            <Input
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Nazwa planu"
              onSubmitEditing={applyRename}
              containerClassName="flex-1"
              autoFocus
              returnKeyType="done"
            />
            <Button label="Zapisz" size="sm" onPress={applyRename} className="ml-2" />
          </View>
        ) : (
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1 pr-3">
              <Text className="text-text-primary text-2xl font-bold leading-tight">{sheet.name}</Text>
              <Text className="text-text-muted text-sm mt-1">
                {sheet.exercises.length === 0
                  ? "Pusty — dodaj ćwiczenia z katalogu"
                  : `${sheet.exercises.length} ${sheet.exercises.length === 1 ? "ćwiczenie" : "ćwiczenia"} w układzie`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={beginRename}
              className="h-10 w-10 items-center justify-center rounded-xl bg-action-secondary border border-border"
              accessibilityLabel="Zmień nazwę planu"
            >
              <PencilLine size={16} strokeWidth={ICON_STROKE} color="#c0c9d8" />
            </TouchableOpacity>
          </View>
        )}

        {sheet.exercises.length === 0 ? (
          <StateBlock
            className="mt-6"
            title="Dodaj ćwiczenia"
            description="Wybierasz z tej samej bazy co we freestyle. Kolejność na liście to kolejność na treningu."
            actionLabel="Dodaj z katalogu"
            onAction={() => setShowPicker(true)}
          />
        ) : (
          sheet.exercises.map((exercise, index) => (
            <Card key={exercise.id} padding="md" className="mb-3">
              <View className="flex-row items-center">
                <Text className="w-8 text-text-muted text-sm font-semibold">{index + 1}</Text>
                <Text className="flex-1 text-text-primary text-base font-semibold pr-2">
                  {exercise.name}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteExercise(exercise.id, exercise.name)}
                  className="h-9 w-9 items-center justify-center rounded-xl bg-action-secondary border border-border"
                  accessibilityLabel={`Usuń ${exercise.name}`}
                >
                  <Trash2 size={16} strokeWidth={ICON_STROKE} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {sheet.exercises.length > 0 ? (
          <Button
            label="Dodaj ćwiczenie"
            icon={Plus}
            variant="secondary"
            onPress={() => setShowPicker(true)}
            className="mt-1"
          />
        ) : null}
      </ScrollView>

      <View className="absolute bottom-6 left-5 right-5">
        <Button
          label={incompleteSession ? "Kontynuuj ten plan" : "Rozpocznij plan"}
          icon={Play}
          onPress={handleStart}
          loading={isStarting || createSession.isPending}
        />
      </View>

      <ExercisePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        existingExerciseNames={existingNames}
        onSelectCatalog={handleAdd}
        onSelectCustom={(name) => handleAdd({ name })}
        loading={isAdding}
      />
    </View>
  );
}
