-- Align composite PK column order with drizzle-kit introspection
-- (locale, material_id). The previous (material_id, locale) order caused
-- infinite phantom DROP/ADD on every `drizzle-kit push`.
ALTER TABLE "learning_material_locale"
  DROP CONSTRAINT IF EXISTS "learning_material_locale_material_id_locale_pk";
--> statement-breakpoint
ALTER TABLE "learning_material_locale"
  ADD CONSTRAINT "learning_material_locale_material_id_locale_pk"
  PRIMARY KEY ("locale", "material_id");
