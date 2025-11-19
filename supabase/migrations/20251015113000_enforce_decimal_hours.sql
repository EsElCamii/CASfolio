-- Ensure activities.hours accepts decimal inputs even on legacy databases
DO $$
DECLARE
  coltype text;
BEGIN
  SELECT data_type
    INTO coltype
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'activities'
     AND column_name = 'hours';

  IF coltype IN ('integer', 'smallint', 'bigint') THEN
    ALTER TABLE public.activities
      ALTER COLUMN hours TYPE numeric(6,2) USING ROUND(hours::numeric, 2);
  END IF;

  ALTER TABLE public.activities
    ALTER COLUMN hours SET DEFAULT 0,
    ALTER COLUMN hours SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_hours_non_negative'
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_hours_non_negative
      CHECK (hours >= 0);
  END IF;
END;
$$;
