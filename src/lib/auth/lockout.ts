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

export async function recordFailedLogin(email: string) {
  const config = lockoutConfig();
  if (!config.enabled) return;

  const identifier = normalizeIdentifier(email);
  const db = getDb();
  const now = new Date();
  const [existing] = await db
    .select()
    .from(authLockout)
    .where(eq(authLockout.identifier, identifier))
    .limit(1);

  if (!existing) {
    await db.insert(authLockout).values({
      identifier,
      failedAttempts: 1,
      lockedUntil: null,
      updatedAt: now,
    });
    return;
  }

  const windowMs = config.windowSeconds * 1000;
  const withinWindow =
    now.getTime() - existing.updatedAt.getTime() <= windowMs;
  const nextAttempts = withinWindow ? existing.failedAttempts + 1 : 1;
  const lockedUntil =
    nextAttempts >= config.maxAttempts
      ? new Date(now.getTime() + config.durationSeconds * 1000)
      : null;

  await db
    .update(authLockout)
    .set({
      failedAttempts: nextAttempts,
      lockedUntil,
      updatedAt: now,
    })
    .where(eq(authLockout.identifier, identifier));
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
