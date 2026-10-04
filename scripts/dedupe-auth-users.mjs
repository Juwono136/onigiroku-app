/**
 * One-time / ops helper: merge users that share the same email (case-insensitive).
 *
 * Keeps the oldest user row, re-points sessions/accounts, deletes duplicate users.
 * Skips merges that would violate (provider_id, account_id) uniqueness.
 *
 * Usage (from repo root, with DATABASE_URL set):
 *   node --env-file=.env ./scripts/dedupe-auth-users.mjs
 *   node --env-file=.env ./scripts/dedupe-auth-users.mjs --apply
 */
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  await sql`UPDATE "user" SET email = lower(trim(email)) WHERE email IS DISTINCT FROM lower(trim(email))`;

  const groups = await sql`
    SELECT lower(email) AS email, array_agg(id ORDER BY created_at ASC) AS ids, COUNT(*)::int AS count
    FROM "user"
    GROUP BY lower(email)
    HAVING COUNT(*) > 1
  `;

  if (groups.length === 0) {
    console.log("No duplicate emails found.");
    await sql.end();
    return;
  }

  console.log(`Found ${groups.length} duplicate email group(s).`);

  for (const group of groups) {
    const ids = group.ids;
    const keepId = ids[0];
    const dropIds = ids.slice(1);
    console.log(`\nEmail ${group.email}: keep=${keepId} drop=${dropIds.join(",")}`);

    if (!APPLY) continue;

    for (const dropId of dropIds) {
      const conflicts = await sql`
        SELECT a.provider_id, a.account_id
        FROM account a
        JOIN account b
          ON a.provider_id = b.provider_id
         AND a.account_id = b.account_id
        WHERE a.user_id = ${dropId}
          AND b.user_id = ${keepId}
      `;

      if (conflicts.length > 0) {
        console.warn(
          `  skip ${dropId}: provider account already on keeper`,
          conflicts,
        );
        continue;
      }

      await sql.begin(async (tx) => {
        await tx`UPDATE account SET user_id = ${keepId} WHERE user_id = ${dropId}`;
        await tx`UPDATE session SET user_id = ${keepId} WHERE user_id = ${dropId}`;
        await tx`DELETE FROM "user" WHERE id = ${dropId}`;
      });
      console.log(`  merged ${dropId} → ${keepId}`);
    }
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to merge.");
  }

  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
