-- Learning paths: categories, ordered student lessons, quizzes, progress, access grants.
-- News rows stay visibility=PUBLIC with no category. Student rows may be unassigned (hidden from students).

DO $$ BEGIN
  CREATE TYPE "learning_category_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "learning_question_type" AS ENUM ('multiple_choice', 'short_answer', 'flashcard');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "learning_progress_status" AS ENUM ('in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "learning_category" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name_id" text NOT NULL,
  "name_en" text DEFAULT '' NOT NULL,
  "description_id" text DEFAULT '' NOT NULL,
  "description_en" text DEFAULT '' NOT NULL,
  "cover_object_key" text,
  "position" integer DEFAULT 0 NOT NULL,
  "status" "learning_category_status" DEFAULT 'DRAFT' NOT NULL,
  "plan_key" text DEFAULT 'free' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "learning_category_slug_uid"
  ON "learning_category" ("slug")
  WHERE "deleted_at" IS NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "learning_category_status_pos_idx"
  ON "learning_category" ("status", "position");--> statement-breakpoint

ALTER TABLE "learning_material"
  ADD COLUMN IF NOT EXISTS "category_id" text,
  ADD COLUMN IF NOT EXISTS "position" integer,
  ADD COLUMN IF NOT EXISTS "pass_score" integer DEFAULT 80 NOT NULL;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "learning_material"
    ADD CONSTRAINT "learning_material_category_id_fk"
    FOREIGN KEY ("category_id") REFERENCES "learning_category"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "learning_material"
    ADD CONSTRAINT "learning_material_public_path_chk"
    CHECK (
      ("visibility" = 'PUBLIC' AND "category_id" IS NULL AND "position" IS NULL)
      OR ("visibility" = 'STUDENT')
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "learning_material"
    ADD CONSTRAINT "learning_material_pass_score_chk"
    CHECK ("pass_score" >= 50 AND "pass_score" <= 100);
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "learning_material_category_position_uid"
  ON "learning_material" ("category_id", "position")
  WHERE "category_id" IS NOT NULL AND "position" IS NOT NULL AND "deleted_at" IS NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "learning_material_category_idx"
  ON "learning_material" ("category_id", "position");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "learning_question" (
  "id" text PRIMARY KEY NOT NULL,
  "material_id" text NOT NULL REFERENCES "learning_material"("id") ON DELETE CASCADE,
  "type" "learning_question_type" NOT NULL,
  "position" integer NOT NULL,
  "prompt_id" text NOT NULL,
  "prompt_en" text DEFAULT '' NOT NULL,
  "explanation_id" text DEFAULT '' NOT NULL,
  "explanation_en" text DEFAULT '' NOT NULL,
  "accepted_answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "answer_id" text DEFAULT '' NOT NULL,
  "answer_en" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "learning_question_material_pos_uid"
  ON "learning_question" ("material_id", "position");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "learning_question_option" (
  "id" text PRIMARY KEY NOT NULL,
  "question_id" text NOT NULL REFERENCES "learning_question"("id") ON DELETE CASCADE,
  "position" integer NOT NULL,
  "label_id" text NOT NULL,
  "label_en" text DEFAULT '' NOT NULL,
  "is_correct" boolean DEFAULT false NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "learning_question_option_question_idx"
  ON "learning_question_option" ("question_id", "position");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "learning_lesson_progress" (
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "material_id" text NOT NULL REFERENCES "learning_material"("id") ON DELETE CASCADE,
  "status" "learning_progress_status" DEFAULT 'in_progress' NOT NULL,
  "reading_percent" integer DEFAULT 0 NOT NULL,
  "last_opened_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "learning_lesson_progress_pk" PRIMARY KEY ("user_id", "material_id"),
  CONSTRAINT "learning_lesson_progress_percent_chk" CHECK ("reading_percent" >= 0 AND "reading_percent" <= 100)
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "learning_quiz_attempt" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "material_id" text NOT NULL REFERENCES "learning_material"("id") ON DELETE CASCADE,
  "score" integer NOT NULL,
  "passed" boolean NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "learning_quiz_attempt_user_material_idx"
  ON "learning_quiz_attempt" ("user_id", "material_id", "created_at" DESC);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "learning_quiz_answer" (
  "attempt_id" text NOT NULL REFERENCES "learning_quiz_attempt"("id") ON DELETE CASCADE,
  "question_id" text NOT NULL REFERENCES "learning_question"("id") ON DELETE CASCADE,
  "selected_option_id" text,
  "text_answer" text DEFAULT '' NOT NULL,
  "knew" boolean,
  "correct" boolean NOT NULL,
  CONSTRAINT "learning_quiz_answer_pk" PRIMARY KEY ("attempt_id", "question_id")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_learning_access" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "plan_key" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "source" text DEFAULT 'manual' NOT NULL,
  "external_ref" text DEFAULT '' NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_learning_access_user_plan_idx"
  ON "user_learning_access" ("user_id", "plan_key", "status");
