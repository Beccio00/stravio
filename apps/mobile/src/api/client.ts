/**
 * Supabase API client.
 *
 * All data (sheets, exercises, sessions, etc.) is stored in Supabase Postgres.
 * RLS policies ensure each user only sees their own data.
 * Works identically on mobile (React Native) and web (Expo web).
 */

import { supabase } from "../lib/supabase";
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
  DeleteSessionSetLogInput,
  SessionSetLog,
  SessionExerciseNote,
  UpsertSessionExerciseNoteInput,
  ExerciseFull,
} from "@bhmt3wp/shared";

// ---------------------------------------------------------------------------
// Helpers – Supabase returns snake_case, our types use camelCase
// ---------------------------------------------------------------------------

async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function mapSheet(row: any): WorkoutSheet {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    orderIndex: row.order_index ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExercise(row: any): Exercise {
  return {
    id: row.id,
    sheetId: row.sheet_id,
    name: row.name,
    notes: row.notes,
    orderIndex: row.order_index,
    createdAt: row.created_at,
  };
}

function mapSet(row: any): ExerciseSet {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    reps: row.reps,
    weightKg: row.weight_kg,
    restTimeSec: row.rest_time_sec,
  };
}

function mapSession(row: any): WorkoutSession {
  return {
    id: row.id,
    userId: row.user_id,
    sheetId: row.sheet_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    notes: row.notes,
  };
}

function mapLog(row: any): SessionSetLog {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    reps: row.reps,
    weightKg: row.weight_kg,
    completedAt: row.completed_at,
  };
}

function mapNote(row: any): SessionExerciseNote {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// API implementation
// ---------------------------------------------------------------------------

export const api = {
  sheets: {
    list: async (): Promise<WorkoutSheet[]> => {
      const { data, error } = await supabase
        .from("workout_sheets")
        .select("*")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapSheet);
    },

    get: async (id: string): Promise<WorkoutSheetFull> => {
      const { data: sheet, error } = await supabase
        .from("workout_sheets")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);

      const { data: exerciseRows } = await supabase
        .from("exercises")
        .select("*")
        .eq("sheet_id", id)
        .order("order_index");

      const exercises: ExerciseFull[] = await Promise.all(
        (exerciseRows ?? []).map(async (exRow) => {
          const { data: setRows } = await supabase
            .from("exercise_sets")
            .select("*")
            .eq("exercise_id", exRow.id)
            .order("set_number");
          return {
            ...mapExercise(exRow),
            sets: (setRows ?? []).map(mapSet),
          };
        }),
      );

      return { ...mapSheet(sheet), exercises };
    },

    create: async (data: CreateWorkoutSheetInput): Promise<WorkoutSheet> => {
      const userId = await getUserId();
      const { data: minRows, error: minErr } = await supabase
        .from("workout_sheets")
        .select("order_index")
        .eq("user_id", userId)
        .order("order_index", { ascending: true })
        .limit(1);
      if (minErr) throw new Error(minErr.message);
      const nextOrder =
        !minRows?.length ? 0 : ((minRows[0] as { order_index: number }).order_index ?? 0) - 1;

      const { data: result, error } = await supabase
        .from("workout_sheets")
        .insert({
          user_id: userId,
          name: data.name,
          description: data.description ?? null,
          order_index: nextOrder,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapSheet(result);
    },

    update: async (id: string, data: UpdateWorkoutSheetInput): Promise<WorkoutSheet> => {
      const updates: Record<string, any> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.description !== undefined) updates.description = data.description;
      if (data.orderIndex !== undefined) updates.order_index = data.orderIndex;

      const { data: result, error } = await supabase
        .from("workout_sheets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapSheet(result);
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from("workout_sheets").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    /** Persists list order: first id = top (order_index 0). */
    reorder: async (orderedIds: string[]): Promise<void> => {
      if (orderedIds.length === 0) return;
      const results = await Promise.all(
        orderedIds.map((sheetId, orderIndex) =>
          supabase.from("workout_sheets").update({ order_index: orderIndex }).eq("id", sheetId),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
    },
  },

  exercises: {
    listBySheet: async (sheetId: string): Promise<Exercise[]> => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("sheet_id", sheetId)
        .order("order_index");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapExercise);
    },

    create: async (data: CreateExerciseInput): Promise<Exercise> => {
      const { data: result, error } = await supabase
        .from("exercises")
        .insert({
          sheet_id: data.sheetId,
          name: data.name,
          notes: data.notes ?? null,
          order_index: data.orderIndex ?? 0,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapExercise(result);
    },

    update: async (id: string, data: UpdateExerciseInput): Promise<Exercise> => {
      const updates: Record<string, any> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.notes !== undefined) updates.notes = data.notes;
      if (data.orderIndex !== undefined) updates.order_index = data.orderIndex;

      const { data: result, error } = await supabase
        .from("exercises")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapExercise(result);
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    reorder: async (orderedIds: string[]): Promise<void> => {
      if (orderedIds.length === 0) return;
      const results = await Promise.all(
        orderedIds.map((exerciseId, orderIndex) =>
          supabase.from("exercises").update({ order_index: orderIndex }).eq("id", exerciseId),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
    },
  },

  sets: {
    listByExercise: async (exerciseId: string): Promise<ExerciseSet[]> => {
      const { data, error } = await supabase
        .from("exercise_sets")
        .select("*")
        .eq("exercise_id", exerciseId)
        .order("set_number");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapSet);
    },

    create: async (data: CreateExerciseSetInput): Promise<ExerciseSet> => {
      const { data: result, error } = await supabase
        .from("exercise_sets")
        .insert({
          exercise_id: data.exerciseId,
          set_number: data.setNumber,
          reps: data.reps,
          weight_kg: data.weightKg,
          rest_time_sec: data.restTimeSec,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapSet(result);
    },

    update: async (id: string, data: UpdateExerciseSetInput): Promise<ExerciseSet> => {
      const updates: Record<string, any> = {};
      if (data.setNumber !== undefined) updates.set_number = data.setNumber;
      if (data.reps !== undefined) updates.reps = data.reps;
      if (data.weightKg !== undefined) updates.weight_kg = data.weightKg;
      if (data.restTimeSec !== undefined) updates.rest_time_sec = data.restTimeSec;

      const { data: result, error } = await supabase
        .from("exercise_sets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapSet(result);
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from("exercise_sets").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  },

  sessions: {
    list: async (): Promise<WorkoutSession[]> => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapSession);
    },

    completed: async (): Promise<WorkoutSessionWithSheet[]> => {
      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select("*, workout_sheets(name)")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });
      if (error) throw new Error(error.message);

      return (sessions ?? []).map((s: any) => ({
        ...mapSession(s),
        sheetName: s.workout_sheets?.name ?? "Deleted sheet",
      }));
    },

    get: async (id: string): Promise<SessionDetailFull> => {
      const { data: session, error } = await supabase
        .from("workout_sessions")
        .select("*, workout_sheets(name)")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);

      const { data: logRows } = await supabase
        .from("session_set_logs")
        .select("*")
        .eq("session_id", id)
        .order("set_number");

      const logs = (logRows ?? []).map(mapLog);

      // Group logs by exercise
      const exerciseIds = [...new Set(logs.map((l) => l.exerciseId))];
      const exercises = await Promise.all(
        exerciseIds.map(async (exId) => {
          const { data: ex } = await supabase
            .from("exercises")
            .select("name")
            .eq("id", exId)
            .single();
          return {
            exerciseId: exId,
            exerciseName: ex?.name ?? "Deleted exercise",
            sets: logs
              .filter((l) => l.exerciseId === exId)
              .sort((a, b) => a.setNumber - b.setNumber),
          };
        }),
      );

      return {
        ...mapSession(session),
        sheetName: session.workout_sheets?.name ?? "Deleted sheet",
        logs,
        exercises,
      };
    },

    create: async (data: CreateWorkoutSessionInput): Promise<WorkoutSession> => {
      const userId = await getUserId();
      const { data: result, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: userId,
          sheet_id: data.sheetId,
          notes: data.notes ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      // Copy exercise template notes to session notes
      const { data: exs } = await supabase
        .from("exercises")
        .select("id, notes")
        .eq("sheet_id", data.sheetId);

      const notesToInsert = (exs ?? [])
        .filter((ex: any) => ex.notes && ex.notes.trim())
        .map((ex: any) => ({
          session_id: result.id,
          exercise_id: ex.id,
          notes: ex.notes,
        }));

      if (notesToInsert.length > 0) {
        await supabase.from("session_exercise_notes").insert(notesToInsert);
      }

      return mapSession(result);
    },

    complete: async (id: string): Promise<WorkoutSession> => {
      const { data: result, error } = await supabase
        .from("workout_sessions")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapSession(result);
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    logSet: async (data: CreateSessionSetLogInput): Promise<SessionSetLog> => {
      const { data: result, error } = await supabase
        .from("session_set_logs")
        .insert({
          session_id: data.sessionId,
          exercise_id: data.exerciseId,
          set_number: data.setNumber,
          reps: data.reps,
          weight_kg: data.weightKg,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapLog(result);
    },

    unlogSet: async (data: DeleteSessionSetLogInput): Promise<void> => {
      const { error } = await supabase
        .from("session_set_logs")
        .delete()
        .eq("session_id", data.sessionId)
        .eq("exercise_id", data.exerciseId)
        .eq("set_number", data.setNumber);
      if (error) throw new Error(error.message);
    },

    lastBySheet: async (
      sheetId: string,
    ): Promise<{ session: WorkoutSession; logs: SessionSetLog[] } | null> => {
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("sheet_id", sheetId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1);

      if (!sessions || sessions.length === 0) return null;
      const lastSession = mapSession(sessions[0]);

      const { data: logRows } = await supabase
        .from("session_set_logs")
        .select("*")
        .eq("session_id", lastSession.id);

      return { session: lastSession, logs: (logRows ?? []).map(mapLog) };
    },

    getExerciseNotes: async (sessionId: string): Promise<SessionExerciseNote[]> => {
      const { data, error } = await supabase
        .from("session_exercise_notes")
        .select("*")
        .eq("session_id", sessionId);
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapNote);
    },

    upsertExerciseNote: async (
      data: UpsertSessionExerciseNoteInput,
    ): Promise<SessionExerciseNote> => {
      // Check if note already exists
      const { data: existing } = await supabase
        .from("session_exercise_notes")
        .select("id")
        .eq("session_id", data.sessionId)
        .eq("exercise_id", data.exerciseId)
        .limit(1);

      if (existing && existing.length > 0) {
        const { data: result, error } = await supabase
          .from("session_exercise_notes")
          .update({ notes: data.notes })
          .eq("id", existing[0].id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return mapNote(result);
      } else {
        const { data: result, error } = await supabase
          .from("session_exercise_notes")
          .insert({
            session_id: data.sessionId,
            exercise_id: data.exerciseId,
            notes: data.notes,
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return mapNote(result);
      }
    },
  },
};
