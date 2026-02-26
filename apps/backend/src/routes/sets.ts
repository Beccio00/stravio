import { FastifyInstance } from "fastify";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import type { CreateExerciseSetInput, UpdateExerciseSetInput } from "@bhmt3wp/shared";

export async function setRoutes(app: FastifyInstance) {
  // GET /api/exercises/:exerciseId/sets
  app.get<{ Params: { exerciseId: string } }>(
    "/api/exercises/:exerciseId/sets",
    async (req) => {
      const exerciseId = parseInt(req.params.exerciseId);
      const result = await db
        .select()
        .from(schema.exerciseSets)
        .where(eq(schema.exerciseSets.exerciseId, exerciseId))
        .orderBy(schema.exerciseSets.setNumber);
      return { data: result };
    }
  );

  // POST /api/sets
  app.post<{ Body: CreateExerciseSetInput }>("/api/sets", async (req, reply) => {
    const { exerciseId, setNumber, reps, weightKg, restTimeSec } = req.body;
    const [result] = await db
      .insert(schema.exerciseSets)
      .values({ exerciseId, setNumber, reps, weightKg, restTimeSec })
      .returning();

    return reply.status(201).send({ data: result });
  });

  // PATCH /api/sets/:id
  app.patch<{ Params: { id: string }; Body: UpdateExerciseSetInput }>(
    "/api/sets/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [result] = await db
        .update(schema.exerciseSets)
        .set(req.body)
        .where(eq(schema.exerciseSets.id, id))
        .returning();

      if (!result) {
        return reply.status(404).send({ error: "not_found", message: "Set not found" });
      }
      return { data: result };
    }
  );

  // DELETE /api/sets/:id
  app.delete<{ Params: { id: string } }>("/api/sets/:id", async (req, reply) => {
    const id = parseInt(req.params.id);
    await db.delete(schema.exerciseSets).where(eq(schema.exerciseSets.id, id));
    return reply.status(204).send();
  });
}
