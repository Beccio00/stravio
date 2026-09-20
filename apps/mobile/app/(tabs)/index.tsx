import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ClipboardList, Clock3, Dumbbell, Flame, Play, TrendingUp } from "lucide-react-native";
import {
  computeSessionLiveStats,
  formatDuration,
  formatVolumeKg,
  sessionDurationSec,
} from "@bhmt3wp/shared";
import { APP_NAME } from "../../src/constants/branding";
import { api } from "../../src/api/client";
import {
  useAnyIncompleteSession,
  useCompletedSessions,
  useCreateSession,
  useDeleteSession,
  useSession,
} from "../../src/api/hooks";
import { ensureFreestyleSheet } from "../../src/lib/ensureFreestyleSheet";
import {
  Badge,
  Button,
  Card,
  ICON_STROKE,
  ScreenHeader,
} from "../../src/components/ui";
import { formatExerciseCount, formatSetCount } from "../../src/lib/polishCount";

export default function HomeScreen() {
  const router = useRouter();
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();
  const { data: completedSessions } = useCompletedSessions();
  const [isStarting, setIsStarting] = useState(false);
  const [elapsedSinceStart, setElapsedSinceStart] = useState(0);

  const lastSessionId = completedSessions?.[0]?.id ?? null;
  const { data: lastSession } = useSession(lastSessionId ?? "");

  const { data: incompleteSession } = useAnyIncompleteSession();

  useEffect(() => {
    if (!incompleteSession?.startedAt) return;
    const startMs = new Date(incompleteSession.startedAt).getTime();
    const tick = () => setElapsedSinceStart(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [incompleteSession?.startedAt]);

  const thisMonthCount = useMemo(() => {
    if (!completedSessions) return 0;
    const now = new Date();
    return completedSessions.filter((session) => {
      if (!session.completedAt) return false;
      const d = new Date(session.completedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [completedSessions]);

  const lastSessionStats = useMemo(() => {
    if (!lastSession?.completedAt) return null;
    const stats = computeSessionLiveStats(lastSession.logs);
    const duration = sessionDurationSec(lastSession.startedAt, lastSession.completedAt);
    return { stats, duration };
  }, [lastSession]);

  const handleStartWorkout = async (force = false) => {
    setIsStarting(true);
    try {
      const { sheetId } = await ensureFreestyleSheet();

      // Guard against creating a duplicate session if one is already in progress
      // (e.g. incompleteSession hadn't loaded yet when this was pressed).
      const existing = incompleteSession ?? (await api.sessions.findIncomplete(sheetId));
      if (existing && !force) {
        router.push(`/workout/${existing.id}?sheetId=${sheetId}`);
        setIsStarting(false);
        return;
      }
      if (existing && force) {
        await deleteSession.mutateAsync(existing.id);
      }

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
    } catch (err) {
      setIsStarting(false);
      const msg = err instanceof Error ? err.message : "Nie można przygotować treningu";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Błąd", msg);
    }
  };

  const handleResumeWorkout = () => {
    if (!incompleteSession) return;
    router.push(`/workout/${incompleteSession.id}?sheetId=${incompleteSession.sheetId}`);
  };

  const confirmCancelWorkout = () => {
    if (!incompleteSession) return;
    const title = "Anuluj trening";
    const message =
      "Usunąć rozpoczęty trening? Zapisane w tej sesji ćwiczenia też znikną. Tej operacji nie można odwrócić.";
    const run = () => deleteSession.mutate(incompleteSession.id);
    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) run();
    } else {
      Alert.alert(title, message, [
        { text: "Zostań", style: "cancel" },
        { text: "Anuluj trening", style: "destructive", onPress: run },
      ]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <ScreenHeader
          title={APP_NAME}
          subtitle={
            thisMonthCount > 0
              ? `${thisMonthCount} ${thisMonthCount === 1 ? "trening" : "treningi"} w tym miesiącu — freestyle albo plan.`
              : "Wybierz: ćwiczenia na bieżąco albo przygotowany plan."
          }
          icon={Dumbbell}
        />
      </View>

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {incompleteSession ? (
          <Card padding="lg" className="border-action-primary/30 bg-surface">
            <View className="flex-row items-center mb-2">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-action-primary/15 border border-action-primary/30">
                <Clock3 size={20} strokeWidth={ICON_STROKE} color="#3b82f6" />
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-text-primary text-xl font-bold leading-tight flex-1">
                    Trening w toku
                  </Text>
                  <Badge label="W trakcie" tone="accent" />
                </View>
                <Text className="text-text-muted text-xs mt-0.5">
                  Zacząłeś {formatDuration(elapsedSinceStart)} temu
                </Text>
              </View>
            </View>

            <Text className="text-text-secondary text-sm mt-2 leading-5">
              Masz niedokończony trening — wróć do niego, żeby nic nie zgubić. Działa dla freestyle i planu.
            </Text>

            <Button
              label="Kontynuuj trening"
              icon={Play}
              onPress={handleResumeWorkout}
              className="mt-5"
            />
            <Button
              label="Zacznij nowy trening"
              variant="ghost"
              size="sm"
              onPress={() => {
                const title = "Nowy trening";
                const message =
                  "Obecna sesja zostanie usunięta (wraz z zapisanymi ćwiczeniami) i zacznie się nowa. Kontynuować?";
                const run = () => handleStartWorkout(true);
                if (Platform.OS === "web") {
                  if (window.confirm(`${title}\n\n${message}`)) run();
                } else {
                  Alert.alert(title, message, [
                    { text: "Zostań", style: "cancel" },
                    { text: "Zacznij nowy", style: "destructive", onPress: run },
                  ]);
                }
              }}
              loading={isStarting || createSession.isPending}
              className="mt-2"
            />
            <Button
              label="Anuluj trening"
              variant="ghost"
              size="sm"
              onPress={confirmCancelWorkout}
              loading={deleteSession.isPending}
              className="mt-1"
            />
          </Card>
        ) : (
          <Card padding="lg" className="border-emphasis/25 bg-surface">
            <View className="flex-row items-center mb-2">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-emphasis/15 border border-emphasis/30">
                <Flame size={20} strokeWidth={ICON_STROKE} color="#22c55e" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-text-primary text-xl font-bold leading-tight">Gotowy do treningu?</Text>
                <Text className="text-text-muted text-xs mt-0.5">Freestyle albo plan z katalogu</Text>
              </View>
            </View>

            <Text className="text-text-secondary text-sm mt-2 leading-5">
              Freestyle — dobierasz ćwiczenia w trakcie. Plan — odpalasz gotowy układ z katalogu.
            </Text>

            <Button
              label="Freestyle"
              icon={Play}
              onPress={() => handleStartWorkout()}
              loading={isStarting || createSession.isPending}
              className="mt-5"
            />
            <Button
              label="Wybierz plan"
              icon={ClipboardList}
              variant="secondary"
              onPress={() => router.push("/plans")}
              className="mt-3"
            />
          </Card>
        )}

        {lastSessionStats ? (
          <Card padding="md" className="mt-4">
            <View className="flex-row items-center mb-2">
              <TrendingUp size={16} strokeWidth={ICON_STROKE} color="#60a5fa" />
              <Text className="ml-2 text-text-secondary text-sm font-semibold">Ostatni trening</Text>
            </View>
            <Text className="text-text-primary text-base font-bold leading-tight">
              {lastSessionStats.stats.totalVolume > 0
                ? formatVolumeKg(lastSessionStats.stats.totalVolume)
                : formatSetCount(lastSessionStats.stats.setCount)}
              {lastSessionStats.duration > 0 ? ` · ${formatDuration(lastSessionStats.duration)}` : ""}
            </Text>
            <View className="mt-2 flex-row flex-wrap items-center gap-2">
              <Badge label={formatExerciseCount(lastSessionStats.stats.exerciseCount)} tone="neutral" />
              {lastSessionStats.stats.setCount > 0 ? (
                <Badge label={formatSetCount(lastSessionStats.stats.setCount)} tone="outline" />
              ) : null}
            </View>
          </Card>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}
