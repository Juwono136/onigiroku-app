-- SaaS class packages + DOKU commerce scaffolding + learning path access_mode

DO $$ BEGIN
  CREATE TYPE class_package_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE learning_access_mode AS ENUM ('free', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE commerce_order_status AS ENUM ('pending', 'paid', 'expired', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE learning_category
  ADD COLUMN IF NOT EXISTS access_mode learning_access_mode NOT NULL DEFAULT 'free';

-- Backfill: non-free plan_key paths become paid
UPDATE learning_category
SET access_mode = 'paid'
WHERE lower(trim(plan_key)) <> 'free' AND access_mode = 'free';

CREATE TABLE IF NOT EXISTS class_package (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name_id text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  description_id text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  price_idr integer NOT NULL CHECK (price_idr >= 0),
  discount_percent integer NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_starts_at timestamptz,
  discount_ends_at timestamptz,
  access_duration_days integer CHECK (access_duration_days IS NULL OR access_duration_days > 0),
  cover_object_key text,
  position integer NOT NULL DEFAULT 0,
  status class_package_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS class_package_slug_uid
  ON class_package (slug) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS class_package_status_pos_idx
  ON class_package (status, position);

CREATE TABLE IF NOT EXISTS class_package_entitlement (
  id text PRIMARY KEY,
  package_id text NOT NULL REFERENCES class_package(id) ON DELETE CASCADE,
  feature_type text NOT NULL,
  target_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- NULL target_id means "all" of that feature type
CREATE UNIQUE INDEX IF NOT EXISTS class_package_entitlement_uniq
  ON class_package_entitlement (package_id, feature_type, COALESCE(target_id, ''));

CREATE INDEX IF NOT EXISTS class_package_entitlement_package_idx
  ON class_package_entitlement (package_id);

CREATE INDEX IF NOT EXISTS class_package_entitlement_feature_idx
  ON class_package_entitlement (feature_type, target_id);

CREATE TABLE IF NOT EXISTS commerce_order (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  package_id text NOT NULL REFERENCES class_package(id),
  invoice_number text NOT NULL,
  amount_idr integer NOT NULL CHECK (amount_idr >= 0),
  currency text NOT NULL DEFAULT 'IDR',
  status commerce_order_status NOT NULL DEFAULT 'pending',
  doku_session_id text NOT NULL DEFAULT '',
  doku_payment_url text NOT NULL DEFAULT '',
  doku_request_id text NOT NULL DEFAULT '',
  external_ref text NOT NULL DEFAULT '',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS commerce_order_invoice_uid ON commerce_order (invoice_number);
CREATE INDEX IF NOT EXISTS commerce_order_user_idx ON commerce_order (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_order_status_idx ON commerce_order (status, created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_order_external_ref_idx ON commerce_order (external_ref)
  WHERE external_ref <> '';

CREATE TABLE IF NOT EXISTS user_feature_grant (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  feature_type text NOT NULL,
  target_id text,
  source text NOT NULL DEFAULT 'doku',
  order_id text REFERENCES commerce_order(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_feature_grant_user_feature_idx
  ON user_feature_grant (user_id, feature_type, status);

CREATE INDEX IF NOT EXISTS user_feature_grant_lookup_idx
  ON user_feature_grant (user_id, feature_type, COALESCE(target_id, ''), status);
