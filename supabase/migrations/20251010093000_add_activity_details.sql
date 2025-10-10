-- Extend activities with detailed reflection fields
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS challenge_description text,
  ADD COLUMN IF NOT EXISTS rating smallint,
  ADD COLUMN IF NOT EXISTS difficulty smallint;

-- Ensure rating range stays within 1-5 when provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'activities_rating_range'
       AND conrelid = 'public.activities'::regclass
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_rating_range
      CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
  END IF;
END$$;

-- Ensure difficulty range stays within 1-10 when provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'activities_difficulty_range'
       AND conrelid = 'public.activities'::regclass
  ) THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT activities_difficulty_range
      CHECK (difficulty IS NULL OR (difficulty >= 1 AND difficulty <= 10));
  END IF;
END$$;
