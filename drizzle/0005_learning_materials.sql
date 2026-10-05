-- Learning materials / news CMS
DO $$ BEGIN
  CREATE TYPE "material_visibility" AS ENUM ('STUDENT', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "material_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "learning_material" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "visibility" "material_visibility" DEFAULT 'STUDENT' NOT NULL,
  "status" "material_status" DEFAULT 'DRAFT' NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "cover_object_key" text,
  "author_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "learning_material_slug_uid" ON "learning_material" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_material_vis_status_pub_idx"
  ON "learning_material" ("visibility", "status", "published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_material_featured_idx"
  ON "learning_material" ("featured", "published_at" DESC NULLS LAST)
  WHERE "featured" = true AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_material_deleted_at_idx" ON "learning_material" ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_material_author_idx" ON "learning_material" ("author_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "learning_material_locale" (
  "material_id" text NOT NULL REFERENCES "learning_material"("id") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "title" text NOT NULL,
  "excerpt" text DEFAULT '' NOT NULL,
  "body" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "body_text" text DEFAULT '' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("locale", "material_id"),
  CONSTRAINT "learning_material_locale_locale_chk" CHECK ("locale" IN ('id', 'en'))
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "learning_material_locale_title_idx"
  ON "learning_material_locale" ("title");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "learning_tag" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name_id" text NOT NULL,
  "name_en" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "learning_tag_slug_uid" ON "learning_tag" ("slug");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "learning_material_tag" (
  "material_id" text NOT NULL REFERENCES "learning_material"("id") ON DELETE CASCADE,
  "tag_id" text NOT NULL REFERENCES "learning_tag"("id") ON DELETE CASCADE,
  PRIMARY KEY ("material_id", "tag_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "learning_material_tag_tag_idx" ON "learning_material_tag" ("tag_id");
