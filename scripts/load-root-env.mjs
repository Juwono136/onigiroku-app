/**
 * Shared root env loader for Onigiroku scripts.
 *
 * Development source of truth: `.env` (gitignored).
 * `.env.example` is a template only — never loaded at runtime.
 * `.env.local` is optional and only fills keys that `.env` did not set
 * (so stale/local placeholders cannot override real secrets in `.env`).
 *
 * Next.js still auto-loads `.env*` itself; keep `.env.local` free of
 * conflicting secrets so the web app stays aligned with the API.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {{ root?: string }} [opts]
 * @returns {{ rootDir: string, loaded: string[], primary: string | null }}
 */
export function loadRootEnv(opts = {}) {
  const root = opts.root ?? rootDir;
  const envPath = path.join(root, ".env");
  const localPath = path.join(root, ".env.local");
  const loaded = [];

  if (existsSync(envPath)) {
    // Primary: always apply `.env` values for this process.
    loadDotenv({ path: envPath, override: true, quiet: true });
    loaded.push(".env");
  }

  if (existsSync(localPath)) {
    // Secondary: fill missing keys only (never override `.env`).
    loadDotenv({ path: localPath, override: false, quiet: true });
    loaded.push(".env.local");
  }

  return {
    rootDir: root,
    loaded,
    primary: loaded.includes(".env") ? ".env" : loaded[0] ?? null,
  };
}

export { rootDir };
