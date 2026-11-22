-- Allow fractional discounts (e.g. 0.25%, 0.5%) for class packages.
-- Checkout still charges whole IDR via rounded effective price.
ALTER TABLE class_package
  DROP CONSTRAINT IF EXISTS class_package_discount_percent_check;

ALTER TABLE class_package
  ALTER COLUMN discount_percent TYPE numeric(5, 2)
  USING discount_percent::numeric(5, 2);

ALTER TABLE class_package
  ALTER COLUMN discount_percent SET DEFAULT 0;

ALTER TABLE class_package
  ADD CONSTRAINT class_package_discount_percent_check
  CHECK (discount_percent >= 0 AND discount_percent <= 100);
