-- User management: active/inactive status + soft delete (trash, 30 days).
DO $$ BEGIN
  CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "status" "user_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deleted_by" text;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_status_idx" ON "user" ("status");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_deleted_at_idx" ON "user" ("deleted_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user" ("role");
