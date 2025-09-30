-- Legacy migration infrastructure for CASfolio

-- Ensure helper functions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Extend activities table with CAS portfolio fields if missing
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'creativity',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS hours integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS learning_outcomes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS header_image_path text,
  ADD COLUMN IF NOT EXISTS header_image_checksum text,
  ADD COLUMN IF NOT EXISTS header_image_updated_at timestamptz;

-- 2. Activity assets table for uploaded evidence
CREATE TABLE IF NOT EXISTS public.activity_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  checksum text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_activity_assets_activity ON public.activity_assets (activity_id);

ALTER TABLE public.activity_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_assets_select_policy ON public.activity_assets;
DROP POLICY IF EXISTS activity_assets_insert_policy ON public.activity_assets;
DROP POLICY IF EXISTS activity_assets_delete_policy ON public.activity_assets;

CREATE POLICY activity_assets_select_policy
  ON public.activity_assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = activity_id AND a.student_id = auth.uid()
    )
  );

CREATE POLICY activity_assets_insert_policy
  ON public.activity_assets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = activity_id AND a.student_id = auth.uid()
    )
  );

CREATE POLICY activity_assets_delete_policy
  ON public.activity_assets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = activity_id AND a.student_id = auth.uid()
    )
  );

-- 3. User migration log table
CREATE TABLE IF NOT EXISTS public.user_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  migration_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  error_message text,
  CONSTRAINT user_migrations_unique UNIQUE (user_id, migration_key)
);

ALTER TABLE public.user_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_migrations_select_policy ON public.user_migrations;
DROP POLICY IF EXISTS user_migrations_insert_policy ON public.user_migrations;
DROP POLICY IF EXISTS user_migrations_update_policy ON public.user_migrations;

CREATE POLICY user_migrations_select_policy
  ON public.user_migrations
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY user_migrations_insert_policy
  ON public.user_migrations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_migrations_update_policy
  ON public.user_migrations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS trg_user_migrations_updated_at ON public.user_migrations;
CREATE TRIGGER trg_user_migrations_updated_at
  BEFORE UPDATE ON public.user_migrations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- 5. Ensure hero metadata columns exist on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hero_image_path text,
  ADD COLUMN IF NOT EXISTS hero_image_checksum text,
  ADD COLUMN IF NOT EXISTS hero_image_updated_at timestamptz;

-- 6. Helper function for activity regeneration used by migration runner
CREATE OR REPLACE FUNCTION public.regenerate_user_activity_feed(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.activities
     SET updated_at = timezone('utc', now())
   WHERE student_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.regenerate_user_activity_feed(uuid) TO service_role;
