-- Add 'ongoing' to the activity_status enum
ALTER TYPE public.activity_status ADD VALUE IF NOT EXISTS 'ongoing';

-- Update any existing activities that should be marked as ongoing
-- This is just an example - adjust the condition based on your business logic
-- UPDATE public.activities 
-- SET status = 'ongoing' 
-- WHERE status = 'draft' AND start_date <= NOW() AND (end_date IS NULL OR end_date >= NOW());
