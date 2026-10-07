-- Per-locale SEO fields for public news / materials
ALTER TABLE "learning_material_locale"
  ADD COLUMN IF NOT EXISTS "seo_title" text DEFAULT '' NOT NULL;--> statement-breakpoint

ALTER TABLE "learning_material_locale"
  ADD COLUMN IF NOT EXISTS "seo_description" text DEFAULT '' NOT NULL;--> statement-breakpoint

COMMENT ON COLUMN "learning_material_locale"."seo_title" IS 'Optional SEO / Open Graph title (max 70 recommended)';--> statement-breakpoint
COMMENT ON COLUMN "learning_material_locale"."seo_description" IS 'Optional SEO / Open Graph description (max 160 recommended)';
