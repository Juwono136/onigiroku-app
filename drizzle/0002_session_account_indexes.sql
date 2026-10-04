-- Concurrency / scale: speed login-history and account lookups by user_id.
CREATE INDEX IF NOT EXISTS "session_user_created_idx"
ON "session" ("user_id", "created_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "account_user_id_idx"
ON "account" ("user_id");
