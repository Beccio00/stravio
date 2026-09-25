import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useCompleteSession,
  useLastSessionBySheet,
  useLogSessionSet,
  useSession,
  useSessionExerciseNotes,
  useSheet,
  useUnlogSessionSet,
  useUpdateExercise,
  useUpsertExerciseNote,
  useUpdateSet,
} from "../../src/api/hooks";
import type { ExerciseFull, ExerciseSet, SessionSetLog } from "@bhmt3wp/shared";
import { prefs } from "../../src/lib/preferences";
import {
  clearSessionState,
  loadSessionState,
  saveRestEndsAt,
  saveSessionState,
} from "../../src/lib/sessionCache";
import {
  cancelRestNotifications,
  showRestNotification,
} from "../../src/lib/restNotifications";
import { REST_TICK_MS, formatRest, restSecondsLeft } from "../../src/lib/restTimer";
import {
  Check,
  Clock3,
  Flame,
  History,
  NotebookPen,
  RotateCcw,
  TimerReset,
} from "lucide-react-native";
import {
  Button,
  Card,
  ICON_SIZE,
  ICON_STROKE,
  Input,
  StateBlock,
  cx,
} from "../../src/components/ui";

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
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
  const sessionId = id!;
  const router = useRouter();

  const { data: sheet } = useSheet(sheetId!);
  const { data: session } = useSession(sessionId);
  const logSet = useLogSessionSet();
  const unlogSet = useUnlogSessionSet();
  const completeSession = useCompleteSession();
  const updateSet = useUpdateSet(sheetId!);
  const updateExercise = useUpdateExercise(sheetId!);
  const { data: lastSessionData } = useLastSessionBySheet(sheetId!);
  const { data: exerciseNotes } = useSessionExerciseNotes(sessionId);
  const upsertNote = useUpsertExerciseNote();

  const prevLogs = useMemo(() => {
    const map: Record<string, SessionSetLog> = {};
    if (lastSessionData?.logs) {
      for (const log of lastSessionData.logs) {
        map[`${log.exerciseId}-${log.setNumber}`] = log;
      }
    }
    return map;
  }, [lastSessionData]);

  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, { kg: string; reps: string }>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  // The rest timer is a deadline, never a counter: see src/lib/restTimer.ts.
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [restEnabled, setRestEnabled] = useState(true);
  const restEndsAtRef = useRef<number | null>(null);
  restEndsAtRef.current = restEndsAt;

  // Restore an in-progress session: the local cache holds the values the user
  // typed but hasn't logged yet; the server logs are the source of truth for
  // sets already marked done (and survive a reinstall or a device change).
  const restoredRef = useRef(false);
  const savingEnabledRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    prefs.restEnabled.get().then(setRestEnabled);
  }, []);

  useEffect(() => {
    if (restoredRef.current || !session) return;
    restoredRef.current = true;

    void (async () => {
      const cached = await loadSessionState(sessionId);
      const isFresh = cached && Date.now() - cached.updatedAt <= 24 * 60 * 60 * 1000;

      const loggedKeys = (session.logs ?? []).map((log) => `${log.exerciseId}-${log.setNumber}`);
      setCompletedSets(new Set([...(isFresh ? cached.completedSets : []), ...loggedKeys]));

      if (isFresh) {
        setEditValues((prev) => ({ ...prev, ...cached.editValues }));
        setNotes((prev) => ({ ...prev, ...cached.notes }));
        // A deadline that has already passed is simply over: restore it only
        // while it is still in the future, and never ring for it retroactively.
        const cachedEndsAt = cached.restEndsAt ?? null;
        if (cachedEndsAt !== null && cachedEndsAt > Date.now()) {
          setRestEndsAt(cachedEndsAt);
        }
      }

      // Show what was actually logged for the sets already done.
      const loggedValues: Record<string, { kg: string; reps: string }> = {};
      for (const log of session.logs ?? []) {
        loggedValues[`${log.exerciseId}-${log.setNumber}`] = {
          kg: log.weightKg.toString(),
          reps: log.reps.toString(),
        };
      }
      setEditValues((prev) => ({ ...prev, ...loggedValues }));

      savingEnabledRef.current = true;
    })();
  }, [session, sessionId]);

  // Persist the in-progress state (debounced) so it survives leaving the screen.
  useEffect(() => {
    if (!savingEnabledRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void saveSessionState(sessionId, {
        completedSets: [...completedSets],
        editValues,
        notes,
        // Carried through so a debounced save cannot clobber a deadline that
        // `saveRestEndsAt` already wrote.
        restEndsAt: restEndsAtRef.current,
        updatedAt: Date.now(),
      });
    }, 300);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [completedSets, editValues, notes, sessionId]);

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

  useEffect(() => {
    if (!exerciseNotes) return;

    const notesMap: Record<string, string> = {};
    for (const note of exerciseNotes) {
      notesMap[note.exerciseId] = note.notes;
    }
    // Server notes only fill the gaps: anything already in state comes from
    // the cache or from the user typing, and is newer.
    setNotes((prev) => ({ ...notesMap, ...prev }));
  }, [exerciseNotes]);

  // Drop the rest from the screen and from the cache, leaving the notifications
  // alone. Used when the deadline simply ran out: the ongoing notification
  // removes itself via `timeoutAfter`, and cancelling here could race the bell
  // trigger and silence it a few milliseconds before it fires.
  //
  // `persist: false` is for the callers that are about to delete the whole
  // cache entry: a fire-and-forget merge could otherwise land afterwards and
  // bring the entry back from the dead.
  const clearRestState = useCallback(
    (persist = true) => {
      setRestEndsAt(null);
      restEndsAtRef.current = null;
      setRestTimeLeft(0);
      if (persist) void saveRestEndsAt(sessionId, null);
    },
    [sessionId],
  );

  // Stop the rest early — Skip, or finishing the workout. Here the bell must go
  // too, because it has not rung yet and no longer should.
  const cancelRest = useCallback(
    (persist = true) => {
      clearRestState(persist);
      void cancelRestNotifications();
    },
    [clearRestState],
  );

  // Refresh the displayed value from the wall clock. The interval only drives
  // the render: if it never fires (app backgrounded, JS thread suspended) the
  // value is still right the instant it is recomputed.
  useEffect(() => {
    if (restEndsAt === null) return;

    const tick = () => {
      const left = restSecondsLeft(restEndsAt);
      setRestTimeLeft(left);
      if (left <= 0) clearRestState();
    };

    tick();
    const interval = setInterval(tick, REST_TICK_MS);
    return () => clearInterval(interval);
  }, [restEndsAt, clearRestState]);

  // Coming back from the background is the moment the old implementation got
  // wrong. Recompute at once instead of waiting for the next interval tick.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const endsAt = restEndsAtRef.current;
      if (endsAt === null) return;
      const left = restSecondsLeft(endsAt);
      if (left <= 0) {
        // The rest finished while we were away: close the card, do not replay
        // the bell — Android already rang it from the scheduled trigger.
        clearRestState();
      } else {
        setRestTimeLeft(left);
      }
    });
    return () => sub.remove();
  }, [clearRestState]);

  // Navigating away deliberately does NOT stop the rest. Being away from the
  // screen is exactly when the notification earns its keep, and the deadline
  // stays in the cache, so the two agree: both live until the rest ends, until
  // Skip, or until the workout is finished. Nothing leaks either — `timeoutAfter`
  // makes Android drop the notification at the deadline on its own.
  //
  // Cancelling here instead would leave the cached deadline behind, so coming
  // back would show a countdown with no notification and no bell.

  const getEditValue = (exerciseId: string, setNumber: number) => {
    const key = `${exerciseId}-${setNumber}`;
    return editValues[key];
  };

  const updateEditValue = (
    exerciseId: string,
    setNumber: number,
    field: "kg" | "reps",
    value: string,
  ) => {
    const key = `${exerciseId}-${setNumber}`;
    setEditValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const updateExerciseNote = (exerciseId: string, text: string) => {
    setNotes((prev) => ({ ...prev, [exerciseId]: text }));
  };

  const handleBlurNote = (exerciseId: string) => {
    const noteText = notes[exerciseId] || "";
    const trimmedNote = noteText.trim();

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
    const actualReps = parseInt(values.reps, 10) || 0;

    logSet.mutate({
      sessionId,
      exerciseId: exercise.id,
      setNumber: set.setNumber,
      reps: actualReps,
      weightKg: actualKg,
    });

    if (actualKg !== set.weightKg) {
      updateSet.mutate({ id: set.id, weightKg: actualKg });
    }

    setCompletedSets((prev) => new Set(prev).add(key));
    if (restEnabled && set.restTimeSec > 0) {
      const endsAt = Date.now() + set.restTimeSec * 1000;
      setRestEndsAt(endsAt);
      restEndsAtRef.current = endsAt;
      setRestTimeLeft(set.restTimeSec);
      // Persisted straight away rather than through the 300 ms debounce: the
      // deadline is the one value that is worthless if it lands late.
      void saveRestEndsAt(sessionId, endsAt);
      void showRestNotification({
        endsAt,
        exerciseName: exercise.name,
        setNumber: set.setNumber,
      });
    }
  };

  const handleUndoSet = async (exercise: ExerciseFull, set: ExerciseSet) => {
    const key = `${exercise.id}-${set.setNumber}`;

    try {
      await unlogSet.mutateAsync({
        sessionId,
        exerciseId: exercise.id,
        setNumber: set.setNumber,
      });

      setCompletedSets((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (Platform.OS === "web") {
        window.alert(`Error: ${msg}`);
      } else {
        Alert.alert("Error", msg);
      }
    }
  };

  const handleFinishWorkout = () => {
    if (completedSets.size === 0) {
      const msg = "Complete at least one set before finishing this workout.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Cannot finish", msg);
      }
      return;
    }

    confirmAction("Finish workout", "Do you want to complete this session now?", async () => {
      try {
        cancelRest(false);
        await completeSession.mutateAsync(sessionId);
        await clearSessionState(sessionId);

        // Carry the session notes back to the sheet template so the next
        // workout starts from what the user wrote today.
        for (const [exerciseId, noteText] of Object.entries(notes)) {
          const trimmed = noteText.trim();
          if (trimmed) {
            updateExercise.mutate({ id: exerciseId, notes: trimmed });
          }
        }
        if (router.canDismiss()) {
          router.dismissAll();
        }
        router.replace("/");
      } catch (error: any) {
        const msg = error?.message || String(error);
        if (Platform.OS === "web") {
          window.alert(`Error: ${msg}`);
        } else {
          Alert.alert("Error", msg);
        }
      }
    });
  };

  if (!sheet) {
    return (
      <SafeAreaView className="flex-1 bg-background px-5 pt-8" edges={["bottom"]}>
        <StateBlock title="Loading workout" description="Preparing your active session." />
      </SafeAreaView>
    );
  }

  const totalSets = sheet.exercises.reduce((acc, exercise) => acc + exercise.sets.length, 0);
  const completedCount = completedSets.size;
  const progress = totalSets > 0 ? (completedCount / totalSets) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <View className="px-5 pt-3 pb-3">
        <Card padding="md">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center">
                <Flame size={16} strokeWidth={ICON_STROKE} color="#22c55e" />
                <Text className="ml-1.5 text-emphasis text-xs font-semibold uppercase">
                  Workout in progress
                </Text>
              </View>
              <Text className="text-text-primary text-xl font-bold mt-1">{sheet.name}</Text>
              <Text className="text-text-secondary text-sm mt-1">
                {completedCount}/{totalSets} sets completed
              </Text>
            </View>

            <Button
              label="Finish"
              icon={Check}
              variant="danger"
              size="sm"
              onPress={handleFinishWorkout}
              loading={completeSession.isPending}
            />
          </View>

          <View className="bg-surface-light rounded-full h-2 mt-4 overflow-hidden">
            <View className="bg-emphasis rounded-full h-2" style={{ width: `${progress}%` }} />
          </View>
        </Card>
      </View>

      {restTimeLeft > 0 ? (
        <View className="px-5 mb-3">
          <Card padding="md" className="bg-action-secondary border-action-primary/30">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Clock3 size={16} strokeWidth={ICON_STROKE} color="#60a5fa" />
                <Text className="ml-2 text-text-secondary text-sm font-semibold uppercase">Rest timer</Text>
              </View>
              <TouchableOpacity onPress={() => cancelRest()}>
                <View className="flex-row items-center">
                  <TimerReset size={14} strokeWidth={ICON_STROKE} color="#7c8aa5" />
                  <Text className="ml-1 text-text-muted text-xs">Skip</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text className="mt-2 text-text-primary text-4xl font-bold">
              {formatRest(restTimeLeft)}
            </Text>
          </Card>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {sheet.exercises.map((exercise) => (
          <Card key={exercise.id} className="mb-3" padding="md">
            <Text className="text-text-primary text-lg font-bold">{exercise.name}</Text>

            {editingNoteId === exercise.id ? (
              <Input
                value={notes[exercise.id] || ""}
                onChangeText={(text) => updateExerciseNote(exercise.id, text)}
                onBlur={() => handleBlurNote(exercise.id)}
                leftIcon={NotebookPen}
                placeholder="Write notes for this exercise"
                multiline
                autoFocus
                containerClassName="mt-3"
              />
            ) : (
              <TouchableOpacity
                className="mt-3 rounded-xl border border-border bg-surface-muted px-3 py-3"
                onPress={() => setEditingNoteId(exercise.id)}
                accessibilityRole="button"
                accessibilityLabel={`Edit notes for ${exercise.name}`}
              >
                <View className="flex-row items-start">
                  <NotebookPen size={16} strokeWidth={ICON_STROKE} color="#7c8aa5" />
                  <Text className="ml-2 flex-1 text-text-muted text-sm">
                    {notes[exercise.id] || "Add notes (RPE, cues, setup)"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <View className="mt-3 mb-2 flex-row px-1">
              <Text className="text-text-muted text-xs w-10 font-semibold">SET</Text>
              <Text className="text-text-muted text-xs flex-1 text-center font-semibold">KG</Text>
              <Text className="text-text-muted text-xs flex-1 text-center font-semibold">REPS</Text>
              <View className="w-20" />
            </View>

            {exercise.sets.map((set) => {
              const key = `${exercise.id}-${set.setNumber}`;
              const isDone = completedSets.has(key);
              const vals = getEditValue(exercise.id, set.setNumber);
              const prev = prevLogs[key];

              return (
                <View key={set.id} className="mb-2 px-1">
                  <View className={cx("flex-row items-center rounded-xl px-2 py-2", isDone ? "bg-emphasis/10" : "bg-surface-muted")}>
                    <Text className="text-text-secondary text-sm w-10 font-semibold">{set.setNumber}</Text>

                    <View className="flex-1 mx-1">
                      <TextInput
                        className={cx(
                          "text-center rounded-lg px-2 py-1 text-sm border",
                          isDone
                            ? "bg-emphasis/10 border-emphasis/30 text-emphasis"
                            : "bg-surface-light border-border text-text-primary",
                        )}
                        value={vals?.kg ?? set.weightKg.toString()}
                        onChangeText={(value) => updateEditValue(exercise.id, set.setNumber, "kg", value)}
                        keyboardType="numeric"
                        editable={!isDone}
                        selectTextOnFocus
                      />
                    </View>

                    <View className="flex-1 mx-1">
                      <TextInput
                        className={cx(
                          "text-center rounded-lg px-2 py-1 text-sm border",
                          isDone
                            ? "bg-emphasis/10 border-emphasis/30 text-emphasis"
                            : "bg-surface-light border-border text-text-primary",
                        )}
                        value={vals?.reps ?? set.reps.toString()}
                        onChangeText={(value) => updateEditValue(exercise.id, set.setNumber, "reps", value)}
                        keyboardType="numeric"
                        editable={!isDone}
                        selectTextOnFocus
                      />
                    </View>

                    <TouchableOpacity
                      className={cx(
                        "w-20 py-2 rounded-xl items-center",
                        isDone ? "bg-action-secondary border border-border" : "bg-action-primary",
                      )}
                      onPress={() => {
                        if (isDone) {
                          handleUndoSet(exercise, set);
                        } else {
                          handleCompleteSet(exercise, set);
                        }
                      }}
                    >
                      <View className="flex-row items-center">
                        {isDone ? (
                          <RotateCcw size={14} strokeWidth={ICON_STROKE} color="#c0c9d8" />
                        ) : (
                          <Check size={14} strokeWidth={ICON_STROKE} color="#ffffff" />
                        )}
                        <Text className={cx("ml-1 text-sm font-semibold", isDone ? "text-text-secondary" : "text-white")}>
                          {isDone ? "Undo" : "Done"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {prev ? (
                    <View className="ml-10 mt-1 flex-row items-center">
                      <History size={12} strokeWidth={ICON_STROKE} color="#7c8aa5" />
                      <Text className="text-text-muted text-xs ml-1">
                        Last time: {prev.weightKg} kg x {prev.reps}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
