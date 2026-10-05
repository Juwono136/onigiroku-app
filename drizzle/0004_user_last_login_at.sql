-- Durable last login timestamp (survives session revoke / natural expiry).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;--> statement-breakpoint

-- Backfill from any sessions that still exist.
UPDATE "user" AS u
SET last_login_at = s.max_created
FROM (
  SELECT user_id, MAX(created_at) AS max_created
  FROM session
  GROUP BY user_id
) AS s
WHERE u.id = s.user_id
  AND (u.last_login_at IS NULL OR u.last_login_at < s.max_created);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_last_login_at_idx" ON "user" ("last_login_at");--> statement-breakpoint

-- Best-effort for verified accounts whose session rows were purged before this column existed.
UPDATE "user"
SET last_login_at = created_at
WHERE last_login_at IS NULL
  AND email_verified = true;
