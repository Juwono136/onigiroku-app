#!/usr/bin/env node
/**
 * Cross-platform Go API launcher for `npm run dev:api`.
 * Loads root `.env` (primary), validates Go + critical config, then runs Gin.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadRootEnv } from "./load-root-env.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(rootDir, "backend");

function assertGoInstalled() {
  const result = spawnSync("go", ["version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error || result.status !== 0) {
    console.error(
      "[dev:api] Go is not available on PATH. Install Go ≥ 1.25 from https://go.dev/dl/",
    );
    process.exit(1);
  }

  console.log(`[dev:api] ${(result.stdout || "").trim()}`);
}

function assertBackendModule() {
  if (!existsSync(path.join(backendDir, "go.mod"))) {
    console.error(`[dev:api] Missing backend module at ${backendDir}`);
    process.exit(1);
  }
  if (!existsSync(path.join(backendDir, "cmd", "api", "main.go"))) {
    console.error("[dev:api] Missing backend entrypoint cmd/api/main.go");
    process.exit(1);
  }
}

function assertCriticalEnv() {
  if (!existsSync(path.join(rootDir, ".env"))) {
    console.error(
      "[dev:api] Missing root `.env`. Copy `.env.example` → `.env` and fill real secrets. Do not run against `.env.example`.",
    );
    process.exit(1);
  }

  const required = [
    "DATABASE_URL",
    "REDIS_URL",
    "INTERNAL_API_SECRET",
    "CORS_ORIGINS",
    "API_PORT",
  ];
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    console.error(
      `[dev:api] Missing required env in \`.env\`: ${missing.join(", ")}.`,
    );
    process.exit(1);
  }

  const db = process.env.DATABASE_URL;
  if (!db.startsWith("postgres://") && !db.startsWith("postgresql://")) {
    console.error("[dev:api] DATABASE_URL must start with postgres:// or postgresql://");
    process.exit(1);
  }

  const redis = process.env.REDIS_URL;
  if (!redis.startsWith("redis://") && !redis.startsWith("rediss://")) {
    console.error("[dev:api] REDIS_URL must start with redis:// or rediss://");
    process.exit(1);
  }
}

function maskDatabaseHost() {
  try {
    const u = new URL(process.env.DATABASE_URL);
    return `${u.hostname}:${u.port || "5432"}/${u.pathname.replace(/^\//, "")}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

function main() {
  const { loaded, primary } = loadRootEnv({ root: rootDir });
  assertGoInstalled();
  assertBackendModule();
  assertCriticalEnv();

  const port = process.env.API_PORT || process.env.PORT || "8080";
  const mode = process.env.GIN_MODE || "debug";

  console.log(
    `[dev:api] env: primary=${primary ?? "none"} loaded=[${loaded.join(", ")}] db=${maskDatabaseHost()}`,
  );
  console.log(
    `[dev:api] starting Gin API on :${port} (GIN_MODE=${mode}, cwd=${backendDir})`,
  );

  const child = spawn("go", ["run", "./cmd/api"], {
    cwd: backendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      API_PORT: port,
      GIN_MODE: mode,
    },
    shell: process.platform === "win32",
  });

  const forward = (signal) => {
    if (!child.killed) child.kill(signal);
  };

  process.on("SIGINT", () => forward("SIGINT"));
  process.on("SIGTERM", () => forward("SIGTERM"));

  child.on("exit", (code, signal) => {
    if (signal) process.exit(0);
    process.exit(code ?? 1);
  });
}

main();
