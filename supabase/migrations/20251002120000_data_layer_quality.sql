-- Step 3 Data Layer Quality Enhancements
-- Align database schema, constraints, and policies with application DTOs

-- Ensure learning_outcomes remains bounded and hours stay non-negative
ALTER TABLE public.activities
  ALTER COLUMN learning_outcomes SET DEFAULT '{}'::text[],
  ADD CONSTRAINT IF NOT EXISTS activities_learning_outcomes_max CHECK (cardinality(learning_outcomes) <= 24),
  ADD CONSTRAINT IF NOT EXISTS activities_hours_non_negative CHECK (hours >= 0);

-- Improve query performance for dashboard hydration
CREATE INDEX IF NOT EXISTS idx_activities_student_created ON public.activities (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_assets_activity_created ON public.activity_assets (activity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_assets_checksum ON public.activity_assets (checksum) WHERE checksum IS NOT NULL;

-- Guard activity asset metadata quality
ALTER TABLE public.activity_assets
  ADD CONSTRAINT IF NOT EXISTS activity_assets_size_non_negative CHECK (size_bytes IS NULL OR size_bytes >= 0);

-- Allow students to update their evidence metadata while respecting ownership
DROP POLICY IF EXISTS activity_assets_update_policy ON public.activity_assets;
CREATE POLICY activity_assets_update_policy
  ON public.activity_assets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = activity_id AND a.student_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = activity_id AND a.student_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Permit students to clean up their own migration logs if needed
DROP POLICY IF EXISTS user_migrations_delete_policy ON public.user_migrations;
CREATE POLICY user_migrations_delete_policy
  ON public.user_migrations
  FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin());

-- Lock CAS settings payload to JSON objects
ALTER TABLE public.users
  ADD CONSTRAINT IF NOT EXISTS users_cas_settings_is_object CHECK (jsonb_typeof(cas_settings) = 'object');
