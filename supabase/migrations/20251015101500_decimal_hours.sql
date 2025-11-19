-- Allow fractional CAS hours for activity records
ALTER TABLE public.activities
  ALTER COLUMN hours TYPE numeric(6,2) USING ROUND(hours::numeric, 2),
  ALTER COLUMN hours SET DEFAULT 0,
  ALTER COLUMN hours SET NOT NULL;

-- Ensure the non-negative guard still exists for the new type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_hours_non_negative'
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_hours_non_negative
      CHECK (hours >= 0);
  END IF;
END;
$$;
