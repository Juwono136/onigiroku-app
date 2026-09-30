import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  const max = Number(process.env.DATABASE_POOL_MAX ?? 10);
  const idle = Number(process.env.DATABASE_POOL_IDLE_TIMEOUT_SEC ?? 20);

  return postgres(url, {
    max: Number.isFinite(max) && max > 0 ? max : 10,
    idle_timeout: Number.isFinite(idle) && idle > 0 ? idle : 20,
    connect_timeout: 10,
    prepare: false,
  });
}

export function getDb() {
  const client = globalForDb.pgClient ?? createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForDb.pgClient = client;
  }
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof getDb>;
