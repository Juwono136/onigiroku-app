ALTER TABLE "learning_material"
ADD COLUMN IF NOT EXISTS "shuffle_questions" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "learning_material"
ADD COLUMN IF NOT EXISTS "shuffle_choices" boolean DEFAULT false NOT NULL;
