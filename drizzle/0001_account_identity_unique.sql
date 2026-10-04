-- Account identity hardening: normalize emails + unique provider accounts.
-- Prevents split identities across Google OAuth and email/password.

-- 1) Normalize emails (Postgres UNIQUE is case-sensitive).
UPDATE "user"
SET email = lower(trim(email))
WHERE email IS DISTINCT FROM lower(trim(email));--> statement-breakpoint

-- 2) One OAuth/credential provider identity → one local user.
CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_account_uid"
ON "account" ("provider_id", "account_id");
