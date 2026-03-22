import { FastifyInstance } from "fastify";
import { db, schema } from "../db/index.js";
import { eq, and, isNotNull, desc } from "drizzle-orm";
import type { CreateWorkoutSessionInput, CreateSessionSetLogInput, UpsertSessionExerciseNoteInput } from "@bhmt3wp/shared";

export async function sessionRoutes(app: FastifyInstance) {
  // GET /api/sessions - List all sessions
  app.get("/api/sessions", async () => {
    const sessions = await db.select().from(schema.workoutSessions);
    return { data: sessions };
  });

  // GET /api/sessions/completed - List completed sessions with sheet name
  app.get("/api/sessions/completed", async () => {
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
        return { ...s, sheetName: sheet?.name ?? "Scheda eliminata" };
      })
    );

    return { data: enriched };
  });

  // GET /api/sessions/:id - Get session with its set logs + exercise names
  app.get<{ Params: { id: string } }>("/api/sessions/:id", async (req, reply) => {
    const id = parseInt(req.params.id);

    const [session] = await db
      .select()
      .from(schema.workoutSessions)
      .where(eq(schema.workoutSessions.id, id))
      .limit(1);

    if (!session) {
      return reply.status(404).send({ error: "not_found", message: "Session not found" });
    }

    // Sheet name
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

    // Group logs by exercise with exercise names
    const exerciseIds = [...new Set(logs.map((l) => l.exerciseId))];
    const exerciseGroups = await Promise.all(
      exerciseIds.map(async (exId) => {
        const [ex] = await db
          .select({ name: schema.exercises.name })
          .from(schema.exercises)
          .where(eq(schema.exercises.id, exId))
          .limit(1);
        return {
          exerciseId: exId,
          exerciseName: ex?.name ?? "Esercizio eliminato",
          sets: logs
            .filter((l) => l.exerciseId === exId)
            .sort((a, b) => a.setNumber - b.setNumber),
        };
      })
    );

    return {
      data: {
        ...session,
        sheetName: sheet?.name ?? "Scheda eliminata",
        logs,
        exercises: exerciseGroups,
      },
    };
  });

  // POST /api/sessions - Start a new workout session
  app.post<{ Body: CreateWorkoutSessionInput }>("/api/sessions", async (req, reply) => {
    const { sheetId, notes } = req.body;
    const numericSheetId = parseInt(sheetId);
    const [result] = await db
      .insert(schema.workoutSessions)
      .values({ sheetId: numericSheetId, notes: notes ?? null })
      .returning();

    // Copy exercise template notes to session notes
    const exercises = await db
      .select()
      .from(schema.exercises)
      .where(eq(schema.exercises.sheetId, numericSheetId));

    const notesToInsert = exercises
      .filter(ex => ex.notes && ex.notes.trim())
      .map(ex => ({
        sessionId: result.id,
        exerciseId: ex.id,
        notes: ex.notes!,
        updatedAt: new Date().toISOString(),
      }));

    if (notesToInsert.length > 0) {
      await db.insert(schema.sessionExerciseNotes).values(notesToInsert);
    }

    return reply.status(201).send({ data: result });
  });

  // PATCH /api/sessions/:id/complete - Mark a session as completed
  app.patch<{ Params: { id: string } }>(
    "/api/sessions/:id/complete",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [result] = await db
        .update(schema.workoutSessions)
        .set({ completedAt: new Date().toISOString() })
        .where(eq(schema.workoutSessions.id, id))
        .returning();

      if (!result) {
        return reply.status(404).send({ error: "not_found", message: "Session not found" });
      }
      return { data: result };
    }
  );

  // POST /api/session-logs - Log a set during a workout
  app.post<{ Body: CreateSessionSetLogInput }>("/api/session-logs", async (req, reply) => {
    const { sessionId, exerciseId, setNumber, reps, weightKg } = req.body;
    const [result] = await db
      .insert(schema.sessionSetLogs)
      .values({
        sessionId: parseInt(sessionId),
        exerciseId: parseInt(exerciseId),
        setNumber,
        reps,
        weightKg,
      })
      .returning();

    return reply.status(201).send({ data: result });
  });

  // DELETE /api/sessions/:id
  app.delete<{ Params: { id: string } }>("/api/sessions/:id", async (req, reply) => {
    const id = parseInt(req.params.id);
    await db.delete(schema.workoutSessions).where(eq(schema.workoutSessions.id, id));
    return reply.status(204).send();
  });

  // GET /api/sessions/last-by-sheet/:sheetId - Get last completed session's set logs
  app.get<{ Params: { sheetId: string } }>(
    "/api/sessions/last-by-sheet/:sheetId",
    async (req, reply) => {
      const sheetId = parseInt(req.params.sheetId);

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

      if (!lastSession) {
        return { data: null };
      }

      const logs = await db
        .select()
        .from(schema.sessionSetLogs)
        .where(eq(schema.sessionSetLogs.sessionId, lastSession.id));

      return { data: { session: lastSession, logs } };
    }
  );

  // GET /api/sessions/:id/exercise-notes - Get all exercise notes for a session
  app.get<{ Params: { id: string } }>("/api/sessions/:id/exercise-notes", async (req) => {
    const sessionId = parseInt(req.params.id);
    const notes = await db
      .select()
      .from(schema.sessionExerciseNotes)
      .where(eq(schema.sessionExerciseNotes.sessionId, sessionId));
    return { data: notes };
  });

  // PUT /api/session-exercise-notes - Upsert (insert or update) exercise note
  app.put<{ Body: UpsertSessionExerciseNoteInput }>(
    "/api/session-exercise-notes",
    async (req, reply) => {
      const { sessionId, exerciseId, notes } = req.body;
      const numericSessionId = parseInt(sessionId);
      const numericExerciseId = parseInt(exerciseId);

      // Check if note already exists
      const [existing] = await db
        .select()
        .from(schema.sessionExerciseNotes)
        .where(
          and(
            eq(schema.sessionExerciseNotes.sessionId, numericSessionId),
            eq(schema.sessionExerciseNotes.exerciseId, numericExerciseId)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing note
        const [result] = await db
          .update(schema.sessionExerciseNotes)
          .set({ notes, updatedAt: new Date().toISOString() })
          .where(eq(schema.sessionExerciseNotes.id, existing.id))
          .returning();
        return { data: result };
      } else {
        // Insert new note
        const [result] = await db
          .insert(schema.sessionExerciseNotes)
          .values({
            sessionId: numericSessionId,
            exerciseId: numericExerciseId,
            notes,
          })
          .returning();
        return reply.status(201).send({ data: result });
      }
    }
  );
}
