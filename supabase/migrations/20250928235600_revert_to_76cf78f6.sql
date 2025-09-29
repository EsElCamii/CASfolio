-- Revert database schema toward the state around commit 76cf78f6
-- WARNING: This is destructive (drops columns/tables). Ensure you have backups.

-- 1) Drop constraints added by the portfolio overhaul
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_header_image_https;
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_gallery_image_https;
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_evidence_urls_https;

-- 2) Drop columns added by the portfolio overhaul
ALTER TABLE public.activities
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS end_date,
  DROP COLUMN IF EXISTS hours,
  DROP COLUMN IF EXISTS header_image_url,
  DROP COLUMN IF EXISTS gallery_image_urls,
  DROP COLUMN IF EXISTS learning_outcomes,
  DROP COLUMN IF EXISTS impacts,
  DROP COLUMN IF EXISTS evidence_urls;

-- 3) Rename activities.user_id back to student_id if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'student_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.activities RENAME COLUMN user_id TO student_id';
  END IF;
END$$;

-- 4) Fix indexes to match student_id
DROP INDEX IF EXISTS idx_activities_user_status;
CREATE INDEX IF NOT EXISTS idx_activities_student_status ON public.activities (student_id, status);

-- 5) Drop tables introduced by the overhaul
DROP TABLE IF EXISTS public.reflections CASCADE;
DROP TABLE IF EXISTS public.portfolio_custom_sections CASCADE;
DROP TABLE IF EXISTS public.portfolio_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 6) Drop helper functions introduced by the overhaul
DROP FUNCTION IF EXISTS public.all_https(text[]);

-- 7) Align RLS policies on activities to use student_id
-- (Drop any existing activities policies and recreate referencing student_id)
DROP POLICY IF EXISTS activities_select_policy ON public.activities;
DROP POLICY IF EXISTS activities_insert_policy ON public.activities;
DROP POLICY IF EXISTS activities_update_policy ON public.activities;
DROP POLICY IF EXISTS activities_delete_policy ON public.activities;

CREATE POLICY activities_select_policy
  ON public.activities
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY activities_insert_policy
  ON public.activities
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY activities_update_policy
  ON public.activities
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY activities_delete_policy
  ON public.activities
  FOR DELETE
  USING (student_id = auth.uid());

-- NOTE: We DO NOT drop the 'portfolio-hero' storage bucket or storage policies here to avoid deleting files.
-- If you need a full revert including storage, confirm and we can add a separate migration to remove the bucket and storage policies.
