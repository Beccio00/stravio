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

async function start() {
  // CORS - allow requests from Expo dev server and web
  await app.register(cors, {
    origin: true,
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
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
  console.log(`🏋️ Gym API running at http://${host}:${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
