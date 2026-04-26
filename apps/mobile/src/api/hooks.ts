import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import type { SessionDetailFull } from "@bhmt3wp/shared";
import { api } from "./client";
import type {
  CreateWorkoutSheetInput,
  UpdateWorkoutSheetInput,
  CreateExerciseInput,
  UpdateExerciseInput,
  CreateExerciseSetInput,
  UpdateExerciseSetInput,
  CreateWorkoutSessionInput,
  CreateSessionSetLogInput,
  DeleteSessionSetLogInput,
  UpsertSessionExerciseNoteInput,
} from "@bhmt3wp/shared";

// ==================== SHEETS ====================

export function useSheets() {
  return useQuery({
    queryKey: ["sheets"],
    queryFn: () => api.sheets.list(),
  });
}

export function useSheet(id: string) {
  return useQuery({
    queryKey: ["sheets", id],
    queryFn: () => api.sheets.get(id),
    enabled: !!id,
  });
}

export function useCreateSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkoutSheetInput) => api.sheets.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sheets"] }),
  });
}

export function useUpdateSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateWorkoutSheetInput & { id: string }) =>
      api.sheets.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sheets"] });
      qc.invalidateQueries({ queryKey: ["sheets", vars.id] });
    },
  });
}

export function useDeleteSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sheets.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sheets"] }),
  });
}

export function useReorderSheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.sheets.reorder(orderedIds),
    onSettled: () => qc.invalidateQueries({ queryKey: ["sheets"] }),
  });
}

// ==================== EXERCISES ====================

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExerciseInput) => api.exercises.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sheets", vars.sheetId] });
    },
  });
}

export function useUpdateExercise(sheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateExerciseInput & { id: string }) =>
      api.exercises.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sheets", sheetId] });
    },
  });
}

export function useDeleteExercise(sheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.exercises.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sheets", sheetId] });
    },
  });
}

export function useReorderExercises(sheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.exercises.reorder(orderedIds),
    onSettled: () => qc.invalidateQueries({ queryKey: ["sheets", sheetId] }),
  });
}

// ==================== SETS ====================

export function useCreateSet(sheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExerciseSetInput) => api.sets.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sheets", sheetId] });
    },
  });
}

export function useUpdateSet(sheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateExerciseSetInput & { id: string }) =>
      api.sets.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sheets", sheetId] });
    },
  });
}

export function useDeleteSet(sheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sets.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sheets", sheetId] });
    },
  });
}

// ==================== SESSIONS ====================

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.sessions.list(),
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ["sessions", id],
    queryFn: () => api.sessions.get(id),
    enabled: !!id,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkoutSessionInput) => api.sessions.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useCompleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sessions.complete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["sessions", id] });
      qc.invalidateQueries({ queryKey: ["sessions", "completed"] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sessions.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["sessions", id] });
      qc.invalidateQueries({ queryKey: ["sessions", "completed"] });
      qc.removeQueries({ queryKey: ["sessions", id] });
    },
  });
}

export function useLogSessionSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSessionSetLogInput) => api.sessions.logSet(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sessions", vars.sessionId] });
    },
  });
}

export function useUnlogSessionSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DeleteSessionSetLogInput) => api.sessions.unlogSet(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sessions", vars.sessionId] });
    },
  });
}

export function useCompletedSessions() {
  return useQuery({
    queryKey: ["sessions", "completed"],
    queryFn: () => api.sessions.completed(),
  });
}

export function useStatsData() {
  const { data: completed = [] } = useCompletedSessions();
  const last10 = completed.slice(0, 10);
  const sessionQueries = useQueries({
    queries: last10.map((s) => ({
      queryKey: ["sessions", s.id],
      queryFn: () => api.sessions.get(s.id),
    })),
  });
  const sessions = sessionQueries
    .map((q) => q.data)
    .filter((s): s is SessionDetailFull => s != null)
    .reverse();
  const isLoading = sessionQueries.some((q) => q.isLoading);
  return { sessions, isLoading };
}

export function useLastSessionBySheet(sheetId: string) {
  return useQuery({
    queryKey: ["sessions", "last-by-sheet", sheetId],
    queryFn: () => api.sessions.lastBySheet(sheetId),
    enabled: !!sheetId,
  });
}

export function useSessionExerciseNotes(sessionId: string) {
  return useQuery({
    queryKey: ["sessions", sessionId, "exercise-notes"],
    queryFn: () => api.sessions.getExerciseNotes(sessionId),
    enabled: !!sessionId,
  });
}

export function useUpsertExerciseNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertSessionExerciseNoteInput) => api.sessions.upsertExerciseNote(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sessions", vars.sessionId, "exercise-notes"] });
    },
  });
}
