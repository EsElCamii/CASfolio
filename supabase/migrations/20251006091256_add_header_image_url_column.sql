-- Add column to store external header image URLs for activities
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS header_image_url text;

-- Ensure existing rows default to NULL (no update needed beyond the column addition)
