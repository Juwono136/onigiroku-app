ALTER TABLE "learning_category"
  ADD COLUMN IF NOT EXISTS "student_view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

ALTER TABLE "learning_category"
  ADD COLUMN IF NOT EXISTS "last_student_access_at" timestamp with time zone;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "learning_category_popularity_idx"
  ON "learning_category" ("student_view_count" DESC, "position" ASC)
  WHERE "deleted_at" IS NULL AND "status" = 'PUBLISHED';
