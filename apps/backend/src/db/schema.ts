import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// --- Workout Sheets (Schede) ---
export const workoutSheets = sqliteTable("workout_sheets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// --- Exercises ---
export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sheetId: integer("sheet_id")
    .notNull()
    .references(() => workoutSheets.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  notes: text("notes"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// --- Exercise Sets (template: what the plan says) ---
export const exerciseSets = sqliteTable("exercise_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  weightKg: real("weight_kg").notNull().default(0),
  restTimeSec: integer("rest_time_sec").notNull().default(60),
});

// --- Workout Sessions (actual workout logs) ---
export const workoutSessions = sqliteTable("workout_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sheetId: integer("sheet_id")
    .notNull()
    .references(() => workoutSheets.id, { onDelete: "cascade" }),
  startedAt: text("started_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  completedAt: text("completed_at"),
  notes: text("notes"),
});

// --- Session Set Logs (what you actually did) ---
export const sessionSetLogs = sqliteTable("session_set_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  weightKg: real("weight_kg").notNull(),
  completedAt: text("completed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
