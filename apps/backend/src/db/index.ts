import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";
import { mkdirSync } from "fs";

// Ensure data directory exists
mkdirSync("./data", { recursive: true });

const client = createClient({
  url: "file:./data/gym.db",
});

export const db = drizzle(client, { schema });
export { schema };
