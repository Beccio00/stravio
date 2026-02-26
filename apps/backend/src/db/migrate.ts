import { createClient } from "@libsql/client";

/**
 * Push the schema to the database (create tables if they don't exist).
 * This is a simple migration approach for development.
 * For production, use drizzle-kit migrate.
 */
export async function runMigrations() {
  const client = createClient({ url: "file:./data/gym.db" });

  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS workout_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_id INTEGER NOT NULL REFERENCES workout_sheets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      notes TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercise_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight_kg REAL NOT NULL DEFAULT 0,
      rest_time_sec INTEGER NOT NULL DEFAULT 60
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_id INTEGER NOT NULL REFERENCES workout_sheets(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS session_set_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  client.close();
  console.log("✅ Database tables ready");
}
