-- Extend activities with detailed reflection fields
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS challenge_description text,
  ADD COLUMN IF NOT EXISTS rating smallint,
  ADD COLUMN IF NOT EXISTS difficulty smallint;

-- Ensure rating range stays within 1-5 when provided
ALTER TABLE public.activities
  ADD CONSTRAINT IF NOT EXISTS activities_rating_range
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Ensure difficulty range stays within 1-10 when provided
ALTER TABLE public.activities
  ADD CONSTRAINT IF NOT EXISTS activities_difficulty_range
  CHECK (difficulty IS NULL OR (difficulty >= 1 AND difficulty <= 10));
