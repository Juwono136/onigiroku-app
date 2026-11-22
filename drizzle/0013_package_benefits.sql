-- Marketing benefit bullets for class packages (SaaS-style "what's included").
ALTER TABLE "class_package"
  ADD COLUMN IF NOT EXISTS "benefits" jsonb NOT NULL DEFAULT '[]'::jsonb;
