#!/usr/bin/env node
/**
 * Config preflight for local development.
 * Validates root `.env` (primary). `.env.example` is the template checklist only.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadRootEnv } from "./load-root-env.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { loaded, primary } = loadRootEnv({ root: rootDir });

if (!existsSync(path.join(rootDir, ".env"))) {
  console.warn(
    "[preflight] Missing root `.env`. Copy `.env.example` → `.env` and fill real secrets. Do not use `.env.example` at runtime.",
  );
} else {
  console.log(
    `[preflight] env sources: primary=${primary} loaded=[${loaded.join(", ")}]`,
  );
}

const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_API_URL",
  "API_PORT",
  "CORS_ORIGINS",
  "DATABASE_URL",
  "REDIS_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "EMAIL_LOGO_URL",
  "STORAGE_ENDPOINT",
  "STORAGE_BUCKET",
  "INTERNAL_API_SECRET",
  "HEALTH_CHECK_TOKEN",
];

const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.warn(`[preflight] Missing keys in \`.env\`: ${missing.join(", ")}`);
}

const warnings = [];

if ((process.env.BETTER_AUTH_SECRET ?? "").length < 32) {
  warnings.push("BETTER_AUTH_SECRET should be at least 32 characters");
}
if ((process.env.INTERNAL_API_SECRET ?? "").length < 16) {
  warnings.push("INTERNAL_API_SECRET should be at least 16 characters");
}
if ((process.env.HEALTH_CHECK_TOKEN ?? "").length < 16) {
  warnings.push("HEALTH_CHECK_TOKEN should be at least 16 characters");
}

const redis = process.env.REDIS_URL ?? "";
if (redis && !redis.startsWith("redis://") && !redis.startsWith("rediss://")) {
  warnings.push("REDIS_URL must start with redis:// or rediss://");
}
if (
  redis &&
  !/^rediss?:\/\/:[^@/]*@/.test(redis) &&
  !/^rediss?:\/\/[^:]+:[^@]+@/.test(redis)
) {
  warnings.push(
    "REDIS_URL should include a password, e.g. redis://:<redis_password>@localhost:6379",
  );
}

const db = process.env.DATABASE_URL ?? "";
if (db && !db.startsWith("postgres://") && !db.startsWith("postgresql://")) {
  warnings.push("DATABASE_URL must start with postgres:// or postgresql://");
}

const logo = process.env.EMAIL_LOGO_URL ?? "";
if (logo && !/^https?:\/\//i.test(logo)) {
  warnings.push("EMAIL_LOGO_URL must be an absolute http(s) URL");
}

for (const w of warnings) {
  console.warn(`[preflight] ${w}`);
}

if (missing.length === 0 && warnings.length === 0) {
  console.log("[preflight] ready — root `.env` looks complete");
} else {
  console.log("[preflight] ready (with warnings) — fix before production");
}
