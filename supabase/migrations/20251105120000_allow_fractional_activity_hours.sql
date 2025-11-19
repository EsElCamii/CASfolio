-- Allow fractional CAS activity hours
-- Convert the hours column to a fixed precision numeric type so decimal values such as 0.75 are accepted.

-- Preserve existing data while changing the column type
ALTER TABLE public.activities
  ALTER COLUMN hours DROP DEFAULT,
  ALTER COLUMN hours TYPE numeric(10,2) USING ROUND(hours::numeric, 2),
  ALTER COLUMN hours SET DEFAULT 0,
  ALTER COLUMN hours SET NOT NULL;

-- Ensure we still enforce non-negative values after the type change
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_hours_non_negative;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_hours_non_negative CHECK (hours >= 0);
