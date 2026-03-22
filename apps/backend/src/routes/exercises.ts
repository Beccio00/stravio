import { FastifyInstance } from "fastify";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import type { CreateExerciseInput, UpdateExerciseInput } from "@bhmt3wp/shared";

export async function exerciseRoutes(app: FastifyInstance) {
  // GET /api/sheets/:sheetId/exercises
  app.get<{ Params: { sheetId: string } }>(
    "/api/sheets/:sheetId/exercises",
    async (req) => {
      const sheetId = parseInt(req.params.sheetId);
      const result = await db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.sheetId, sheetId))
        .orderBy(schema.exercises.orderIndex);
      return { data: result };
    }
  );

  // POST /api/exercises
  app.post<{ Body: CreateExerciseInput }>("/api/exercises", async (req, reply) => {
    const { sheetId, name, notes, orderIndex } = req.body;
    const [result] = await db
      .insert(schema.exercises)
      .values({
        sheetId: parseInt(sheetId),
        name,
        notes: notes ?? null,
        orderIndex: orderIndex ?? 0,
      })
      .returning();

    return reply.status(201).send({ data: result });
  });

  // PATCH /api/exercises/:id
  app.patch<{ Params: { id: string }; Body: UpdateExerciseInput }>(
    "/api/exercises/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [result] = await db
        .update(schema.exercises)
        .set(req.body)
        .where(eq(schema.exercises.id, id))
        .returning();

      if (!result) {
        return reply.status(404).send({ error: "not_found", message: "Exercise not found" });
      }
      return { data: result };
    }
  );

  // DELETE /api/exercises/:id
  app.delete<{ Params: { id: string } }>("/api/exercises/:id", async (req, reply) => {
    const id = parseInt(req.params.id);
    await db.delete(schema.exercises).where(eq(schema.exercises.id, id));
    return reply.status(204).send();
  });
}
