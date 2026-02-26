import { FastifyInstance } from "fastify";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import type { CreateWorkoutSessionInput, CreateSessionSetLogInput } from "@bhmt3wp/shared";

export async function sessionRoutes(app: FastifyInstance) {
  // GET /api/sessions - List all sessions
  app.get("/api/sessions", async () => {
    const sessions = await db.select().from(schema.workoutSessions);
    return { data: sessions };
  });

  // GET /api/sessions/:id - Get session with its set logs
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

    const logs = await db
      .select()
      .from(schema.sessionSetLogs)
      .where(eq(schema.sessionSetLogs.sessionId, id));

    return { data: { ...session, logs } };
  });

  // POST /api/sessions - Start a new workout session
  app.post<{ Body: CreateWorkoutSessionInput }>("/api/sessions", async (req, reply) => {
    const { sheetId, notes } = req.body;
    const [result] = await db
      .insert(schema.workoutSessions)
      .values({ sheetId, notes: notes ?? null })
      .returning();

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
      .values({ sessionId, exerciseId, setNumber, reps, weightKg })
      .returning();

    return reply.status(201).send({ data: result });
  });

  // DELETE /api/sessions/:id
  app.delete<{ Params: { id: string } }>("/api/sessions/:id", async (req, reply) => {
    const id = parseInt(req.params.id);
    await db.delete(schema.workoutSessions).where(eq(schema.workoutSessions.id, id));
    return reply.status(204).send();
  });
}
