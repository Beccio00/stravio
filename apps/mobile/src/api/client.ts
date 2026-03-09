/**
 * Local-first API client.
 *
 * On native (phone APK) → uses a local SQLite database (expo-sqlite + drizzle).
 * On web (dev) → calls the Fastify backend (HTTP).
 *
 * The exported `api` object has the exact same shape in both cases,
 * so hooks.ts and all screens work unchanged.
 *
 * In the future, swap this to a remote backend by changing the
 * implementation behind `api`.
 */

import { Platform } from "react-native";
import type {
  WorkoutSheet,
  WorkoutSheetFull,
  Exercise,
  ExerciseSet,
  WorkoutSession,
  WorkoutSessionWithSheet,
  SessionDetailFull,
  CreateWorkoutSheetInput,
  UpdateWorkoutSheetInput,
  CreateExerciseInput,
  UpdateExerciseInput,
  CreateExerciseSetInput,
  UpdateExerciseSetInput,
  CreateWorkoutSessionInput,
  CreateSessionSetLogInput,
  SessionSetLog,
  SessionExerciseNote,
  UpsertSessionExerciseNoteInput,
  ExerciseFull,
  ApiResponse,
} from "@bhmt3wp/shared";

// =====================================================
// WEB → HTTP client (dev only, talks to Fastify backend)
// =====================================================
function createHttpApi() {
  const getBaseUrl = () => {
    const host =
      typeof window !== "undefined" ? window.location.hostname : "localhost";
    return `http://${host}:3000`;
  };

  const BASE_URL = getBaseUrl();

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      ...((options?.headers as Record<string, string>) || {}),
    };
    if (options?.body) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  return {
    sheets: {
      list: () =>
        request<ApiResponse<WorkoutSheet[]>>("/api/sheets").then(
          (r) => r.data
        ),
      get: (id: number) =>
        request<ApiResponse<WorkoutSheetFull>>(`/api/sheets/${id}`).then(
          (r) => r.data
        ),
      create: (data: CreateWorkoutSheetInput) =>
        request<ApiResponse<WorkoutSheet>>("/api/sheets", {
          method: "POST",
          body: JSON.stringify(data),
        }).then((r) => r.data),
      update: (id: number, data: UpdateWorkoutSheetInput) =>
        request<ApiResponse<WorkoutSheet>>(`/api/sheets/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }).then((r) => r.data),
      delete: (id: number) =>
        request<void>(`/api/sheets/${id}`, { method: "DELETE" }),
    },
    exercises: {
      listBySheet: (sheetId: number) =>
        request<ApiResponse<Exercise[]>>(
          `/api/sheets/${sheetId}/exercises`
        ).then((r) => r.data),
      create: (data: CreateExerciseInput) =>
        request<ApiResponse<Exercise>>("/api/exercises", {
          method: "POST",
          body: JSON.stringify(data),
        }).then((r) => r.data),
      update: (id: number, data: UpdateExerciseInput) =>
        request<ApiResponse<Exercise>>(`/api/exercises/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }).then((r) => r.data),
      delete: (id: number) =>
        request<void>(`/api/exercises/${id}`, { method: "DELETE" }),
    },
    sets: {
      listByExercise: (exerciseId: number) =>
        request<ApiResponse<ExerciseSet[]>>(
          `/api/exercises/${exerciseId}/sets`
        ).then((r) => r.data),
      create: (data: CreateExerciseSetInput) =>
        request<ApiResponse<ExerciseSet>>("/api/sets", {
          method: "POST",
          body: JSON.stringify(data),
        }).then((r) => r.data),
      update: (id: number, data: UpdateExerciseSetInput) =>
        request<ApiResponse<ExerciseSet>>(`/api/sets/${id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }).then((r) => r.data),
      delete: (id: number) =>
        request<void>(`/api/sets/${id}`, { method: "DELETE" }),
    },
    sessions: {
      list: () =>
        request<ApiResponse<WorkoutSession[]>>("/api/sessions").then(
          (r) => r.data
        ),
      completed: () =>
        request<ApiResponse<WorkoutSessionWithSheet[]>>(
          "/api/sessions/completed"
        ).then((r) => r.data),
      get: (id: number) =>
        request<ApiResponse<SessionDetailFull>>(`/api/sessions/${id}`).then(
          (r) => r.data
        ),
      create: (data: CreateWorkoutSessionInput) =>
        request<ApiResponse<WorkoutSession>>("/api/sessions", {
          method: "POST",
          body: JSON.stringify(data),
        }).then((r) => r.data),
      complete: (id: number) =>
        request<ApiResponse<WorkoutSession>>(
          `/api/sessions/${id}/complete`,
          { method: "PATCH" }
        ).then((r) => r.data),
      delete: (id: number) =>
        request<void>(`/api/sessions/${id}`, { method: "DELETE" }),
      logSet: (data: CreateSessionSetLogInput) =>
        request<ApiResponse<SessionSetLog>>("/api/session-logs", {
          method: "POST",
          body: JSON.stringify(data),
        }).then((r) => r.data),
      lastBySheet: (sheetId: number) =>
        request<
          ApiResponse<{
            session: WorkoutSession;
            logs: SessionSetLog[];
          } | null>
        >(`/api/sessions/last-by-sheet/${sheetId}`).then((r) => r.data),
      getExerciseNotes: (sessionId: number) =>
        request<ApiResponse<SessionExerciseNote[]>>(
          `/api/sessions/${sessionId}/exercise-notes`
        ).then((r) => r.data),
      upsertExerciseNote: (data: UpsertSessionExerciseNoteInput) =>
        request<ApiResponse<SessionExerciseNote>>(
          "/api/session-exercise-notes",
          { method: "PUT", body: JSON.stringify(data) }
        ).then((r) => r.data),
    },
  };
}

// =====================================================
// NATIVE → Local SQLite database
// =====================================================
function createLocalApi() {
  // Lazy import so web bundle doesn't pull in expo-sqlite
  const { db, schema } =
    require("../db") as typeof import("../db");
  const { eq, and, isNotNull, desc } =
    require("drizzle-orm") as typeof import("drizzle-orm");

  return {
    sheets: {
      list: async (): Promise<WorkoutSheet[]> => {
        return db.select().from(schema.workoutSheets);
      },

      get: async (id: number): Promise<WorkoutSheetFull> => {
        const [sheet] = await db
          .select()
          .from(schema.workoutSheets)
          .where(eq(schema.workoutSheets.id, id))
          .limit(1);
        if (!sheet) throw new Error("Sheet not found");

        const exerciseRows = await db
          .select()
          .from(schema.exercises)
          .where(eq(schema.exercises.sheetId, id))
          .orderBy(schema.exercises.orderIndex);

        const exercisesWithSets: ExerciseFull[] = await Promise.all(
          exerciseRows.map(async (ex) => {
            const sets = await db
              .select()
              .from(schema.exerciseSets)
              .where(eq(schema.exerciseSets.exerciseId, ex.id))
              .orderBy(schema.exerciseSets.setNumber);
            return { ...ex, sets } as ExerciseFull;
          })
        );

        return { ...sheet, exercises: exercisesWithSets };
      },

      create: async (data: CreateWorkoutSheetInput): Promise<WorkoutSheet> => {
        const [result] = await db
          .insert(schema.workoutSheets)
          .values({
            name: data.name,
            description: data.description ?? null,
          })
          .returning();
        return result;
      },

      update: async (
        id: number,
        data: UpdateWorkoutSheetInput
      ): Promise<WorkoutSheet> => {
        const [result] = await db
          .update(schema.workoutSheets)
          .set({ ...data, updatedAt: new Date().toISOString() })
          .where(eq(schema.workoutSheets.id, id))
          .returning();
        if (!result) throw new Error("Sheet not found");
        return result;
      },

      delete: async (id: number): Promise<void> => {
        await db
          .delete(schema.workoutSheets)
          .where(eq(schema.workoutSheets.id, id));
      },
    },

    exercises: {
      listBySheet: async (sheetId: number): Promise<Exercise[]> => {
        return db
          .select()
          .from(schema.exercises)
          .where(eq(schema.exercises.sheetId, sheetId))
          .orderBy(schema.exercises.orderIndex);
      },

      create: async (data: CreateExerciseInput): Promise<Exercise> => {
        const [result] = await db
          .insert(schema.exercises)
          .values({
            sheetId: data.sheetId,
            name: data.name,
            notes: data.notes ?? null,
            orderIndex: data.orderIndex ?? 0,
          })
          .returning();
        return result;
      },

      update: async (
        id: number,
        data: UpdateExerciseInput
      ): Promise<Exercise> => {
        const [result] = await db
          .update(schema.exercises)
          .set(data)
          .where(eq(schema.exercises.id, id))
          .returning();
        if (!result) throw new Error("Exercise not found");
        return result;
      },

      delete: async (id: number): Promise<void> => {
        await db.delete(schema.exercises).where(eq(schema.exercises.id, id));
      },
    },

    sets: {
      listByExercise: async (exerciseId: number): Promise<ExerciseSet[]> => {
        return db
          .select()
          .from(schema.exerciseSets)
          .where(eq(schema.exerciseSets.exerciseId, exerciseId))
          .orderBy(schema.exerciseSets.setNumber);
      },

      create: async (data: CreateExerciseSetInput): Promise<ExerciseSet> => {
        const [result] = await db
          .insert(schema.exerciseSets)
          .values(data)
          .returning();
        return result;
      },

      update: async (
        id: number,
        data: UpdateExerciseSetInput
      ): Promise<ExerciseSet> => {
        const [result] = await db
          .update(schema.exerciseSets)
          .set(data)
          .where(eq(schema.exerciseSets.id, id))
          .returning();
        if (!result) throw new Error("Set not found");
        return result;
      },

      delete: async (id: number): Promise<void> => {
        await db
          .delete(schema.exerciseSets)
          .where(eq(schema.exerciseSets.id, id));
      },
    },

    sessions: {
      list: async (): Promise<WorkoutSession[]> => {
        return db.select().from(schema.workoutSessions);
      },

      completed: async (): Promise<WorkoutSessionWithSheet[]> => {
        const sessions = await db
          .select()
          .from(schema.workoutSessions)
          .where(isNotNull(schema.workoutSessions.completedAt))
          .orderBy(desc(schema.workoutSessions.completedAt));

        const enriched = await Promise.all(
          sessions.map(async (s) => {
            const [sheet] = await db
              .select({ name: schema.workoutSheets.name })
              .from(schema.workoutSheets)
              .where(eq(schema.workoutSheets.id, s.sheetId))
              .limit(1);
            return {
              ...s,
              sheetName: sheet?.name ?? "Deleted sheet",
            };
          })
        );
        return enriched;
      },

      get: async (id: number): Promise<SessionDetailFull> => {
        const [session] = await db
          .select()
          .from(schema.workoutSessions)
          .where(eq(schema.workoutSessions.id, id))
          .limit(1);
        if (!session) throw new Error("Session not found");

        const [sheet] = await db
          .select({ name: schema.workoutSheets.name })
          .from(schema.workoutSheets)
          .where(eq(schema.workoutSheets.id, session.sheetId))
          .limit(1);

        const logs = await db
          .select()
          .from(schema.sessionSetLogs)
          .where(eq(schema.sessionSetLogs.sessionId, id))
          .orderBy(schema.sessionSetLogs.setNumber);

        const exerciseIds = [...new Set(logs.map((l) => l.exerciseId))];
        const exercises = await Promise.all(
          exerciseIds.map(async (exId) => {
            const [ex] = await db
              .select({ name: schema.exercises.name })
              .from(schema.exercises)
              .where(eq(schema.exercises.id, exId))
              .limit(1);
            return {
              exerciseId: exId,
              exerciseName: ex?.name ?? "Deleted exercise",
              sets: logs
                .filter((l) => l.exerciseId === exId)
                .sort((a, b) => a.setNumber - b.setNumber),
            };
          })
        );

        return {
          ...session,
          sheetName: sheet?.name ?? "Deleted sheet",
          logs,
          exercises,
        };
      },

      create: async (
        data: CreateWorkoutSessionInput
      ): Promise<WorkoutSession> => {
        const [result] = await db
          .insert(schema.workoutSessions)
          .values({ sheetId: data.sheetId, notes: data.notes ?? null })
          .returning();

        // Copy exercise template notes to session notes
        const exs = await db
          .select()
          .from(schema.exercises)
          .where(eq(schema.exercises.sheetId, data.sheetId));

        const notesToInsert = exs
          .filter((ex) => ex.notes && ex.notes.trim())
          .map((ex) => ({
            sessionId: result.id,
            exerciseId: ex.id,
            notes: ex.notes!,
            updatedAt: new Date().toISOString(),
          }));

        if (notesToInsert.length > 0) {
          await db.insert(schema.sessionExerciseNotes).values(notesToInsert);
        }

        return result;
      },

      complete: async (id: number): Promise<WorkoutSession> => {
        const [result] = await db
          .update(schema.workoutSessions)
          .set({ completedAt: new Date().toISOString() })
          .where(eq(schema.workoutSessions.id, id))
          .returning();
        if (!result) throw new Error("Session not found");
        return result;
      },

      delete: async (id: number): Promise<void> => {
        await db
          .delete(schema.workoutSessions)
          .where(eq(schema.workoutSessions.id, id));
      },

      logSet: async (
        data: CreateSessionSetLogInput
      ): Promise<SessionSetLog> => {
        const [result] = await db
          .insert(schema.sessionSetLogs)
          .values(data)
          .returning();
        return result;
      },

      lastBySheet: async (
        sheetId: number
      ): Promise<{
        session: WorkoutSession;
        logs: SessionSetLog[];
      } | null> => {
        const [lastSession] = await db
          .select()
          .from(schema.workoutSessions)
          .where(
            and(
              eq(schema.workoutSessions.sheetId, sheetId),
              isNotNull(schema.workoutSessions.completedAt)
            )
          )
          .orderBy(desc(schema.workoutSessions.completedAt))
          .limit(1);

        if (!lastSession) return null;

        const logs = await db
          .select()
          .from(schema.sessionSetLogs)
          .where(eq(schema.sessionSetLogs.sessionId, lastSession.id));

        return { session: lastSession, logs };
      },

      getExerciseNotes: async (
        sessionId: number
      ): Promise<SessionExerciseNote[]> => {
        return db
          .select()
          .from(schema.sessionExerciseNotes)
          .where(eq(schema.sessionExerciseNotes.sessionId, sessionId));
      },

      upsertExerciseNote: async (
        data: UpsertSessionExerciseNoteInput
      ): Promise<SessionExerciseNote> => {
        const [existing] = await db
          .select()
          .from(schema.sessionExerciseNotes)
          .where(
            and(
              eq(schema.sessionExerciseNotes.sessionId, data.sessionId),
              eq(schema.sessionExerciseNotes.exerciseId, data.exerciseId)
            )
          )
          .limit(1);

        if (existing) {
          const [result] = await db
            .update(schema.sessionExerciseNotes)
            .set({
              notes: data.notes,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.sessionExerciseNotes.id, existing.id))
            .returning();
          return result;
        } else {
          const [result] = await db
            .insert(schema.sessionExerciseNotes)
            .values(data)
            .returning();
          return result;
        }
      },
    },
  };
}

// =====================================================
// Export the right implementation based on platform
// =====================================================
export const api =
  Platform.OS === "web" ? createHttpApi() : createLocalApi();
