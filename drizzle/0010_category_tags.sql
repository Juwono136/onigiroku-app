CREATE TABLE IF NOT EXISTS "learning_category_tag" (
	"category_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "learning_category_tag_category_id_tag_id_pk" PRIMARY KEY("tag_id","category_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_category_tag" ADD CONSTRAINT "learning_category_tag_category_id_learning_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."learning_category"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_category_tag" ADD CONSTRAINT "learning_category_tag_tag_id_learning_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."learning_tag"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_category_tag_tag_idx" ON "learning_category_tag" USING btree ("tag_id");
