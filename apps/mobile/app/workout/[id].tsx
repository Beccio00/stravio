import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCompleteSession,
  useDeleteSession,
  useLastSessionBySheet,
  useSession,
  useSessionExerciseNotes,
  useSheet,
  useUpdateSession,
} from "../../src/api/hooks";
import type { CatalogExercise, ExerciseFull, SessionSetLog } from "@bhmt3wp/shared";
import {
  computeSessionLiveStats,
  formatDuration,
  formatVolumeKg,
  formatWeightKg,
  isTimeBasedExercise,
} from "@bhmt3wp/shared";
import {
  CalendarClock,
  Check,
  Flame,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react-native";
import { EditSessionDateSheet } from "../../src/components/EditSessionDateSheet";
import { ExercisePicker } from "../../src/components/ExercisePicker";
import {
  createDraftFromLogs,
  ExerciseLogForm,
  ExerciseLogSummary,
  type ExerciseLogDraft,
} from "../../src/components/ExerciseLogForm";
import { addCatalogExerciseToSheet } from "../../src/lib/addCatalogExercise";
import { isFreestyleSheetName } from "../../src/lib/ensureFreestyleSheet";
import { getAutofillPrevious } from "../../src/lib/appPreferences";
import { discardSessionExercise } from "../../src/lib/discardSessionExercise";
import { hapticSuccess } from "../../src/lib/haptics";
import { parseExerciseLogDraft, saveExerciseLogBatch } from "../../src/lib/saveExerciseLogBatch";
import {
  Button,
  Card,
  ICON_STROKE,
  StateBlock,
  useToast,
} from "../../src/components/ui";

function useVisualViewportInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Anuluj", style: "cancel" },
      { text: "Potwierdź", onPress: onConfirm },
    ]);
  }
}

function StatTile({
  label,
  value,
  borderedRight = false,
  borderedTop = false,
}: {
  label: string;
  value: string;
  borderedRight?: boolean;
  borderedTop?: boolean;
}) {
  return (
    <View
      className={`flex-1 px-3 py-2.5${borderedRight ? " border-r border-border" : ""}${borderedTop ? " border-t border-border" : ""}`}
    >
      <Text className="text-text-muted text-[10px] font-semibold uppercase tracking-wide leading-none">
        {label}
      </Text>
      <Text className="text-text-primary text-base font-bold mt-1 leading-tight" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SessionStatsGrid({
  exerciseCount,
  setCount,
  totalVolume,
  elapsedSec,
  bestEst1rm,
  totalReps,
}: {
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  elapsedSec: number;
  bestEst1rm: number;
  totalReps: number;
}) {
  return (
    <View className="rounded-xl border border-border bg-surface-muted overflow-hidden">
      <View className="flex-row">
        <StatTile label="Ćwiczenia" value={String(exerciseCount)} borderedRight />
        <StatTile label="Serie" value={String(setCount)} />
      </View>
      <View className="flex-row">
        <StatTile
          label="Objętość"
          value={totalVolume > 0 ? formatVolumeKg(totalVolume) : "—"}
          borderedRight
          borderedTop
        />
        <StatTile label="Czas" value={formatDuration(elapsedSec)} borderedTop />
      </View>
      <View className="flex-row">
        <StatTile
          label="Naj. 1RM"
          value={bestEst1rm > 0 ? formatWeightKg(bestEst1rm) : "—"}
          borderedRight
          borderedTop
        />
        <StatTile
          label="Powtórzenia"
          value={totalReps > 0 ? String(totalReps) : "—"}
          borderedTop
        />
      </View>
    </View>
  );
}

export default function WorkoutScreen() {
  const { id, sheetId } = useLocalSearchParams<{ id: string; sheetId: string }>();
  const sessionId = id!;
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const leavingIntentionallyRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const keyboardInset = useVisualViewportInset();

  const { data: sheet, refetch: refetchSheet } = useSheet(sheetId!);
  const { data: session, refetch: refetchSession } = useSession(sessionId);
  const completeSession = useCompleteSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const [showEditStart, setShowEditStart] = useState(false);
  const { data: lastSessionData } = useLastSessionBySheet(sheetId!);
  const { data: exerciseNotes } = useSessionExerciseNotes(sessionId);

  const [sessionExerciseIds, setSessionExerciseIds] = useState<Set<string>>(new Set());
  const [savedExerciseIds, setSavedExerciseIds] = useState<Set<string>>(new Set());
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [savingExerciseId, setSavingExerciseId] = useState<string | null>(null);
  const [discardingExerciseId, setDiscardingExerciseId] = useState<string | null>(null);
  const [autofillPrevious, setAutofillPrevious] = useState(true);
  const planSeededRef = useRef(false);

  useEffect(() => {
    getAutofillPrevious().then(setAutofillPrevious);
  }, []);

  useEffect(() => {
    if (!sheet || isFreestyleSheetName(sheet.name) || planSeededRef.current) return;
    if (sheet.exercises.length === 0) return;
    planSeededRef.current = true;
    setSessionExerciseIds(new Set(sheet.exercises.map((exercise) => exercise.id)));
  }, [sheet]);

  const previousByExercise = useMemo(() => {
    const map: Record<string, SessionSetLog> = {};
    if (lastSessionData?.logs) {
      for (const log of lastSessionData.logs) {
        map[log.exerciseId] = log;
      }
    }
    return map;
  }, [lastSessionData]);

  const notesByExercise = useMemo(() => {
    const map: Record<string, string> = {};
    for (const note of exerciseNotes ?? []) {
      map[note.exerciseId] = note.notes;
    }
    return map;
  }, [exerciseNotes]);

  const liveStats = useMemo(
    () => computeSessionLiveStats(session?.logs ?? []),
    [session?.logs],
  );

  const activeExercises = useMemo(() => {
    if (!sheet) return [];
    const logExerciseIds = new Set(session?.logs.map((log) => log.exerciseId) ?? []);
    return sheet.exercises.filter(
      (exercise) => sessionExerciseIds.has(exercise.id) || logExerciseIds.has(exercise.id),
    );
  }, [sheet, sessionExerciseIds, session?.logs]);

  const existingExerciseNames = useMemo(
    () => activeExercises.map((exercise) => exercise.name),
    [activeExercises],
  );

  useEffect(() => {
    if (!session?.logs) return;
    const fromLogs = new Set<string>();
    const saved = new Set<string>();
    for (const log of session.logs) {
      fromLogs.add(log.exerciseId);
      saved.add(log.exerciseId);
    }
    if (fromLogs.size > 0) {
      setSessionExerciseIds((prev) => new Set([...prev, ...fromLogs]));
      setSavedExerciseIds((prev) => new Set([...prev, ...saved]));
    }
  }, [session?.logs]);

  useEffect(() => {
    if (!session?.startedAt) return;
    const startMs = new Date(session.startedAt).getTime();
    const tick = () => setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session?.startedAt]);

  // Soft guard: warn before leaving an unfinished workout (back button/gesture).
  // Data itself is never lost (it's saved to Supabase per exercise), and Home
  // now offers "Kontynuuj trening" — but most exits are accidental, so we
  // confirm first rather than silently stranding the session.
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (leavingIntentionallyRef.current) return;
      e.preventDefault();
      confirmAction(
        "Wyjść z treningu?",
        "Trening nie jest zakończony. Zapisane ćwiczenia są bezpieczne — możesz go dokończyć później przyciskiem „Kontynuuj trening” na ekranie głównym.",
        () => {
          leavingIntentionallyRef.current = true;
          navigation.dispatch(e.data.action);
        },
      );
    });
    return unsubscribe;
  }, [navigation]);

  const refreshData = useCallback(async () => {
    await Promise.all([
      refetchSheet(),
      refetchSession(),
      queryClient.invalidateQueries({ queryKey: ["sheets", sheetId] }),
      queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] }),
      queryClient.invalidateQueries({ queryKey: ["sessions", sessionId, "exercise-notes"] }),
    ]);
  }, [queryClient, refetchSession, refetchSheet, sessionId, sheetId]);

  const handleAddFromCatalog = async (exercise: CatalogExercise | { name: string; timeBased?: boolean }) => {
    if (!sheet) return;
    setIsAddingExercise(true);
    try {
      const orderIndex = sheet.exercises.length;
      const { exerciseId } = await addCatalogExerciseToSheet(sheetId!, exercise, orderIndex, {
        setCount: 0,
      });
      setSessionExerciseIds((prev) => new Set(prev).add(exerciseId));
      setSavedExerciseIds((prev) => {
        const next = new Set(prev);
        next.delete(exerciseId);
        return next;
      });
      setEditingExerciseId(exerciseId);
      setShowExercisePicker(false);
      await refreshData();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nie można dodać ćwiczenia";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Błąd", msg);
    } finally {
      setIsAddingExercise(false);
    }
  };

  const handleSaveExercise = async (exercise: ExerciseFull, draft: ExerciseLogDraft) => {
    setSavingExerciseId(exercise.id);
    try {
      const parsed = parseExerciseLogDraft(exercise.name, draft);
      await saveExerciseLogBatch(sessionId, exercise, parsed);
      setSavedExerciseIds((prev) => new Set(prev).add(exercise.id));
      setEditingExerciseId(null);
      await hapticSuccess();
      showToast({ tone: "success", message: "Zapisano ćwiczenie" });
      await refreshData();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Nie można zapisać ćwiczenia";
      const msg = raw.trim() || "Nie udało się zapisać";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        showToast({ tone: "error", message: msg });
      }
    } finally {
      setSavingExerciseId(null);
    }
  };

  const getExerciseLogs = (exerciseId: string) =>
    (session?.logs ?? [])
      .filter((log) => log.exerciseId === exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);

  const removeExerciseFromLocalState = (exerciseId: string) => {
    setSessionExerciseIds((prev) => {
      const next = new Set(prev);
      next.delete(exerciseId);
      return next;
    });
    setSavedExerciseIds((prev) => {
      const next = new Set(prev);
      next.delete(exerciseId);
      return next;
    });
    setEditingExerciseId((prev) => (prev === exerciseId ? null : prev));
  };

  const handleDeleteExercise = (exercise: ExerciseFull) => {
    confirmAction(
      "Usuń ćwiczenie",
      `Usunąć "${exercise.name}" z tego treningu razem ze wszystkimi zapisanymi seriami?`,
      async () => {
        setDiscardingExerciseId(exercise.id);
        try {
          await discardSessionExercise(sessionId, exercise.id);
          removeExerciseFromLocalState(exercise.id);
          await refreshData();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Nie można usunąć ćwiczenia";
          if (Platform.OS === "web") window.alert(msg);
          else Alert.alert("Błąd", msg);
        } finally {
          setDiscardingExerciseId(null);
        }
      },
    );
  };

  const handleDiscardDraftExercise = (exerciseId: string) => {
    // Nothing was ever saved to the server for a draft — just drop it locally.
    removeExerciseFromLocalState(exerciseId);
  };

  const handleFinishWorkout = () => {
    const loggedSets = session?.logs.length ?? 0;
    if (loggedSets === 0) {
      const msg = "Zapisz przynajmniej jedno ćwiczenie przed zakończeniem treningu.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Nie można zakończyć", msg);
      }
      return;
    }

    confirmAction("Zakończ trening", "Czy chcesz teraz zakończyć tę sesję?", async () => {
      try {
        await completeSession.mutateAsync(sessionId);
        leavingIntentionallyRef.current = true;
        router.replace(`/workout/summary/${sessionId}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (Platform.OS === "web") {
          window.alert(`Błąd: ${msg}`);
        } else {
          Alert.alert("Błąd", msg);
        }
      }
    });
  };

  const handleCancelWorkout = () => {
    confirmAction(
      "Anuluj trening",
      "Usunąć tę sesję? Zapisane ćwiczenia znikną. Tej operacji nie można odwrócić.",
      async () => {
        try {
          leavingIntentionallyRef.current = true;
          await deleteSession.mutateAsync(sessionId);
          router.replace("/");
        } catch (error: unknown) {
          leavingIntentionallyRef.current = false;
          const msg = error instanceof Error ? error.message : String(error);
          if (Platform.OS === "web") window.alert(`Błąd: ${msg}`);
          else Alert.alert("Błąd", msg);
        }
      },
    );
  };

  if (!sheet) {
    return (
      <SafeAreaView className="flex-1 bg-background px-5 pt-8" edges={["bottom"]}>
        <StateBlock title="Wczytywanie treningu" description="Przygotowywanie aktywnej sesji." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <View className="px-5 pt-3 pb-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3 min-w-0">
              <View className="flex-row items-center">
                <Flame size={16} strokeWidth={ICON_STROKE} color="#22c55e" />
                <Text className="ml-1.5 text-emphasis text-xs font-semibold uppercase">
                  Trening w trakcie
                </Text>
              </View>
              <Text className="text-text-primary text-xl font-bold mt-0.5 leading-tight" numberOfLines={1}>
                {isFreestyleSheetName(sheet.name) ? "Freestyle" : sheet.name}
              </Text>
              {session?.startedAt ? (
                <TouchableOpacity
                  onPress={() => setShowEditStart(true)}
                  className="flex-row items-center mt-1"
                  accessibilityLabel="Edytuj godzinę rozpoczęcia"
                >
                  <CalendarClock size={13} strokeWidth={2} color="#7c8aa5" />
                  <Text className="ml-1 text-text-muted text-xs" numberOfLines={1}>
                    {new Date(session.startedAt).toLocaleString("pl-PL", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {formatDuration(elapsedSec)}
                    {" · Popraw"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Button
              label="Zakończ"
              icon={Check}
              variant="danger"
              size="sm"
              onPress={handleFinishWorkout}
              loading={completeSession.isPending}
            />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 48 + keyboardInset,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Card padding="md" className="mb-3">
            <SessionStatsGrid
              exerciseCount={liveStats.exerciseCount}
              setCount={liveStats.setCount}
              totalVolume={liveStats.totalVolume}
              elapsedSec={elapsedSec}
              bestEst1rm={liveStats.bestEst1rm}
              totalReps={liveStats.totalReps}
            />
            <Button
              label="Anuluj trening"
              variant="ghost"
              size="sm"
              onPress={handleCancelWorkout}
              loading={deleteSession.isPending}
              className="mt-3"
            />
          </Card>

          {activeExercises.length === 0 ? (
            <StateBlock
              title="Dodaj pierwsze ćwiczenie"
              description="Wybierz ćwiczenie z katalogu, wpisz liczbę serii, ciężar i powtórzenia — resztę policzymy za Ciebie."
              actionLabel="Dodaj ćwiczenie"
              onAction={() => setShowExercisePicker(true)}
              className="mt-1"
            />
          ) : (
            activeExercises.map((exercise) => {
              const logs = getExerciseLogs(exercise.id);
              const isSaved = savedExerciseIds.has(exercise.id) && logs.length > 0;
              const isEditing = editingExerciseId === exercise.id || !isSaved;
              const rawPreviousLog = previousByExercise[exercise.id] ?? null;
              const previousLog = autofillPrevious ? rawPreviousLog : null;
              const initialDraft = isSaved
                ? createDraftFromLogs(logs, notesByExercise[exercise.id] ?? "")
                : {
                    setCount: "1",
                    weightKg: previousLog ? String(previousLog.weightKg) : "0",
                    reps: previousLog ? String(previousLog.reps) : "10",
                    notes: notesByExercise[exercise.id] ?? "",
                  };

              return (
                <Card key={exercise.id} className="mb-3" padding="md">
                  <View className="relative mb-3 min-h-[36px] justify-center pr-[76px]">
                    <Text
                      className="text-text-primary text-lg font-bold leading-tight"
                      numberOfLines={2}
                    >
                      {exercise.name}
                    </Text>
                    {isSaved ? (
                      <View className="absolute right-0 top-0 flex-row items-center gap-2">
                        {!isEditing ? (
                          <TouchableOpacity
                            onPress={() => setEditingExerciseId(exercise.id)}
                            className="h-9 w-9 items-center justify-center rounded-xl bg-action-secondary border border-border"
                            accessibilityLabel={`Edytuj ${exercise.name}`}
                          >
                            <PencilLine size={16} strokeWidth={ICON_STROKE} color="#c0c9d8" />
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => handleDeleteExercise(exercise)}
                          disabled={discardingExerciseId === exercise.id}
                          className="h-9 w-9 items-center justify-center rounded-xl bg-action-secondary border border-border"
                          accessibilityLabel={`Usuń ${exercise.name} z treningu`}
                        >
                          <Trash2 size={16} strokeWidth={ICON_STROKE} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>

                  {isEditing ? (
                    <ExerciseLogForm
                      key={`${exercise.id}-${isSaved ? "edit" : "new"}`}
                      exerciseName={exercise.name}
                      timeBased={isTimeBasedExercise(exercise.name)}
                      previousLog={previousLog}
                      initialDraft={initialDraft}
                      onSave={(draft) => handleSaveExercise(exercise, draft)}
                      onCancel={
                        isSaved
                          ? () => setEditingExerciseId(null)
                          : undefined
                      }
                      onDiscard={isSaved ? undefined : () => handleDiscardDraftExercise(exercise.id)}
                      discardLabel="Usuń tę kartę"
                      loading={savingExerciseId === exercise.id}
                      saveLabel={isSaved ? "Zaktualizuj" : "Zapisz ćwiczenie"}
                    />
                  ) : (
                    <ExerciseLogSummary
                      exerciseName={exercise.name}
                      setCount={logs.length}
                      weightKg={logs[0]?.weightKg ?? 0}
                      reps={logs[0]?.reps ?? 0}
                      notes={notesByExercise[exercise.id]}
                      timeBased={isTimeBasedExercise(exercise.name)}
                    />
                  )}
                </Card>
              );
            })
          )}

          {activeExercises.length > 0 ? (
            <Button
              label="Dodaj kolejne ćwiczenie"
              icon={Plus}
              variant="secondary"
              onPress={() => setShowExercisePicker(true)}
              className="mb-4"
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        existingExerciseNames={existingExerciseNames}
        onSelectCatalog={handleAddFromCatalog}
        onSelectCustom={(name) => handleAddFromCatalog({ name })}
        loading={isAddingExercise}
      />

      {session?.startedAt ? (
        <EditSessionDateSheet
          visible={showEditStart}
          onClose={() => setShowEditStart(false)}
          initialStartedIso={session.startedAt}
          saving={updateSession.isPending}
          title="Popraw godzinę rozpoczęcia"
          subtitle="Jeśli zacząłeś trening wcześniej, a otworzyłeś aplikację później, popraw tutaj."
          onSave={({ startedAt }) => {
            updateSession.mutate(
              { id: sessionId, data: { startedAt } },
              { onSuccess: () => setShowEditStart(false) },
            );
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
