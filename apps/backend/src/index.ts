import Fastify from "fastify";
import cors from "@fastify/cors";
import { sheetRoutes } from "./routes/sheets.js";
import { exerciseRoutes } from "./routes/exercises.js";
import { setRoutes } from "./routes/sets.js";
import { sessionRoutes } from "./routes/sessions.js";
import { runMigrations } from "./db/migrate.js";

const app = Fastify({
  logger: true,
});

const ENABLE_LEGACY_BACKEND = process.env.ENABLE_LEGACY_BACKEND === "true";
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
];

async function start() {
  if (!ENABLE_LEGACY_BACKEND) {
    throw new Error(
      [
        "Legacy backend is disabled for security reasons.",
        "This project uses Supabase directly.",
        "If you still need this legacy server for local-only debugging, run with:",
        "ENABLE_LEGACY_BACKEND=true npm run dev -w apps/backend",
      ].join(" "),
    );
  }

  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  // Restrictive CORS to reduce accidental exposure
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("CORS origin not allowed"), false);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  // Run DB migrations on start
  await runMigrations();

  // Register routes
  await sheetRoutes(app);
  await exerciseRoutes(app);
  await setRoutes(app);
  await sessionRoutes(app);

  // Health check
  app.get("/api/health", async () => ({ status: "ok" }));

  const port = parseInt(process.env.PORT ?? "3000");
  const host = process.env.HOST ?? "127.0.0.1";

  await app.listen({ port, host });
  console.log(`🏋️ Gym API running at http://${host}:${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
