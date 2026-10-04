import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { account, user } from "@/lib/db/schema";

export type AuthIdentity = {
  userId: string;
  email: string;
  emailVerified: boolean;
  hasCredential: boolean;
  hasGoogle: boolean;
  providers: string[];
};

/** Always store / compare emails in lowercase (Postgres UNIQUE is case-sensitive). */
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Load local identity + linked providers for an email.
 * Used to prevent confusing duplicate sign-up/sign-in flows across Google vs credential.
 */
export async function getAuthIdentityByEmail(
  email: string,
): Promise<AuthIdentity | null> {
  const normalized = normalizeAuthEmail(email);
  if (!normalized) return null;

  const db = getDb();
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);

  if (!row) {
    // Fallback for legacy mixed-case rows that predate normalization.
    const [legacy] = await db
      .select({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      })
      .from(user)
      .where(sql`lower(${user.email}) = ${normalized}`)
      .limit(1);
    if (!legacy) return null;
    return hydrateIdentity(legacy);
  }

  return hydrateIdentity(row);
}

async function hydrateIdentity(row: {
  id: string;
  email: string;
  emailVerified: boolean;
}): Promise<AuthIdentity> {
  const db = getDb();
  const rows = await db
    .select({ providerId: account.providerId })
    .from(account)
    .where(eq(account.userId, row.id));

  const providers = rows.map((r) => r.providerId);
  return {
    userId: row.id,
    email: row.email,
    emailVerified: row.emailVerified,
    hasCredential: providers.includes("credential"),
    hasGoogle: providers.includes("google"),
    providers,
  };
}

/** True when this identity can only sign in via OAuth (no password yet). */
export function isSocialOnlyIdentity(identity: AuthIdentity): boolean {
  return !identity.hasCredential && identity.providers.length > 0;
}

/**
 * Ensure a credential account does not already exist for another provider key
 * collision path. Used by maintenance scripts.
 */
export async function countUsersSharingEmail(email: string): Promise<number> {
  const normalized = normalizeAuthEmail(email);
  const db = getDb();
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${normalized}`);
  return rows.length;
}

export async function findDuplicateProviderAccounts() {
  const db = getDb();
  return db.execute(sql`
    SELECT provider_id, account_id, COUNT(*)::int AS count
    FROM account
    GROUP BY provider_id, account_id
    HAVING COUNT(*) > 1
  `);
}

export async function findAccountsForUser(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(account)
    .where(eq(account.userId, userId));
}

export async function findCredentialAccount(userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "credential")),
    )
    .limit(1);
  return row ?? null;
}
