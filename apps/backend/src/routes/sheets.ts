import { FastifyInstance } from "fastify";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import type {
  CreateWorkoutSheetInput,
  UpdateWorkoutSheetInput,
  WorkoutSheet,
  WorkoutSheetFull,
  ExerciseFull,
} from "@bhmt3wp/shared";

export async function sheetRoutes(app: FastifyInstance) {
  // GET /api/sheets - List all sheets
  app.get("/api/sheets", async () => {
    const sheets = await db.select().from(schema.workoutSheets);
    return { data: sheets };
  });

  // GET /api/sheets/:id - Get sheet with exercises and sets
  app.get<{ Params: { id: string } }>("/api/sheets/:id", async (req, reply) => {
    const id = parseInt(req.params.id);

    const [sheet] = await db
      .select()
      .from(schema.workoutSheets)
      .where(eq(schema.workoutSheets.id, id))
      .limit(1);

    if (!sheet) {
      return reply.status(404).send({ error: "not_found", message: "Sheet not found" });
    }

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
        return { ...ex, sets };
      })
    );

    const result: WorkoutSheetFull = { ...sheet, exercises: exercisesWithSets };
    return { data: result };
  });

  // POST /api/sheets - Create a new sheet
  app.post<{ Body: CreateWorkoutSheetInput }>("/api/sheets", async (req, reply) => {
    const { name, description } = req.body;
    const [result] = await db
      .insert(schema.workoutSheets)
      .values({ name, description: description ?? null })
      .returning();

    return reply.status(201).send({ data: result });
  });

  // PATCH /api/sheets/:id - Update a sheet
  app.patch<{ Params: { id: string }; Body: UpdateWorkoutSheetInput }>(
    "/api/sheets/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const updates: Record<string, any> = { ...req.body };
      updates.updatedAt = new Date().toISOString();

      const [result] = await db
        .update(schema.workoutSheets)
        .set(updates)
        .where(eq(schema.workoutSheets.id, id))
        .returning();

      if (!result) {
        return reply.status(404).send({ error: "not_found", message: "Sheet not found" });
      }
      return { data: result };
    }
  );

  // DELETE /api/sheets/:id
  app.delete<{ Params: { id: string } }>("/api/sheets/:id", async (req, reply) => {
    const id = parseInt(req.params.id);
    await db.delete(schema.workoutSheets).where(eq(schema.workoutSheets.id, id));
    return reply.status(204).send();
  });
}
