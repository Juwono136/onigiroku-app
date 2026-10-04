import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { authLockout } from "@/lib/db/schema";

function lockoutConfig() {
  const enabled =
    (process.env.AUTH_LOCKOUT_ENABLED ?? "true").toLowerCase() !== "false";
  const maxAttempts = Number(process.env.AUTH_LOCKOUT_MAX_ATTEMPTS ?? 5);
  const windowSeconds = Number(process.env.AUTH_LOCKOUT_WINDOW_SECONDS ?? 900);
  const durationSeconds = Number(
    process.env.AUTH_LOCKOUT_DURATION_SECONDS ?? 1800,
  );

  return {
    enabled,
    maxAttempts: Number.isFinite(maxAttempts) ? maxAttempts : 5,
    windowSeconds: Number.isFinite(windowSeconds) ? windowSeconds : 900,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 1800,
  };
}

function normalizeIdentifier(email: string) {
  return email.trim().toLowerCase();
}

export async function assertNotLockedOut(email: string) {
  const config = lockoutConfig();
  if (!config.enabled) return;

  const identifier = normalizeIdentifier(email);
  const db = getDb();
  const [row] = await db
    .select()
    .from(authLockout)
    .where(eq(authLockout.identifier, identifier))
    .limit(1);

  if (!row?.lockedUntil) return;

  if (row.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.max(
      1,
      Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60_000),
    );
    throw new Error(`ACCOUNT_LOCKED:${minutes}`);
  }
}

/**
 * Atomically increment failed attempts inside a short transaction so concurrent
 * credential-stuffing requests cannot under-count the lockout threshold.
 */
export async function recordFailedLogin(email: string) {
  const config = lockoutConfig();
  if (!config.enabled) return;

  const identifier = normalizeIdentifier(email);
  const db = getDb();
  const windowSeconds = config.windowSeconds;
  const maxAttempts = config.maxAttempts;
  const durationSeconds = config.durationSeconds;

  await db.execute(sql`
    INSERT INTO auth_lockout (identifier, failed_attempts, locked_until, updated_at)
    VALUES (${identifier}, 1, NULL, NOW())
    ON CONFLICT (identifier) DO UPDATE SET
      failed_attempts = CASE
        WHEN auth_lockout.updated_at >= NOW() - (${windowSeconds} || ' seconds')::interval
          THEN auth_lockout.failed_attempts + 1
        ELSE 1
      END,
      locked_until = CASE
        WHEN (
          CASE
            WHEN auth_lockout.updated_at >= NOW() - (${windowSeconds} || ' seconds')::interval
              THEN auth_lockout.failed_attempts + 1
            ELSE 1
          END
        ) >= ${maxAttempts}
          THEN NOW() + (${durationSeconds} || ' seconds')::interval
        ELSE NULL
      END,
      updated_at = NOW()
  `);
}

export async function clearLockout(email: string) {
  const config = lockoutConfig();
  if (!config.enabled) return;

  const identifier = normalizeIdentifier(email);
  const db = getDb();
  await db
    .update(authLockout)
    .set({
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(authLockout.identifier, identifier));
}

/** Housekeeping for long-lived deployments (optional cron). */
export async function pruneStaleLockouts(olderThanHours = 72) {
  const db = getDb();
  await db.execute(sql`
    delete from auth_lockout
    where locked_until is null
      and updated_at < now() - (${olderThanHours} || ' hours')::interval
  `);
}
