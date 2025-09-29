-- Portfolio data model overhaul

-- Ensure helper enums exist before we change tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_status') THEN
        CREATE TYPE public.activity_status AS ENUM ('draft', 'pending', 'completed');
    END IF;
END$$;

-- Profiles store top-level identity information for a portfolio owner
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    display_name text,
    headline text,
    bio text,
    avatar_url text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Portfolio settings split the editable UI configuration
CREATE TABLE IF NOT EXISTS public.portfolio_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    layout jsonb,
    theme jsonb,
    content jsonb,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Custom sections allow rich page blocks beyond the built-in layout
CREATE TABLE IF NOT EXISTS public.portfolio_custom_sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    section_key text NOT NULL,
    title text NOT NULL,
    body jsonb NOT NULL DEFAULT '{}'::jsonb,
    position integer NOT NULL DEFAULT 0,
    visible boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT portfolio_custom_sections_unique_key UNIQUE (user_id, section_key)
);

-- Activities now store CAS metadata and enforce HTTPS media links
ALTER TABLE public.activities
    RENAME COLUMN student_id TO user_id;

ALTER TABLE public.activities
    ADD COLUMN IF NOT EXISTS category text,
    ADD COLUMN IF NOT EXISTS start_date date,
    ADD COLUMN IF NOT EXISTS end_date date,
    ADD COLUMN IF NOT EXISTS hours numeric CHECK (hours >= 0),
    ADD COLUMN IF NOT EXISTS header_image_url text,
    ADD COLUMN IF NOT EXISTS gallery_image_urls text[] DEFAULT ARRAY[]::text[],
    ADD COLUMN IF NOT EXISTS learning_outcomes text[] DEFAULT ARRAY[]::text[],
    ADD COLUMN IF NOT EXISTS impacts text[] DEFAULT ARRAY[]::text[],
    ADD COLUMN IF NOT EXISTS evidence_urls text[] DEFAULT ARRAY[]::text[];

ALTER TABLE public.activities
    ALTER COLUMN header_image_url SET DEFAULT 'https://placeholder.invalid/hero-image';

-- Backfill header_image_url for existing rows before enforcing NOT NULL
UPDATE public.activities
SET header_image_url = COALESCE(NULLIF(header_image_url, ''), 'https://placeholder.invalid/hero-image')
WHERE header_image_url IS NULL OR header_image_url !~* '^https://';

ALTER TABLE public.activities
    ALTER COLUMN header_image_url SET NOT NULL,
    ALTER COLUMN header_image_url DROP DEFAULT,
    ADD CONSTRAINT activities_header_image_https
        CHECK (header_image_url ~* '^https://');

ALTER TABLE public.activities
    ADD CONSTRAINT activities_gallery_image_https
        CHECK (gallery_image_urls IS NULL OR NOT EXISTS (
            SELECT 1 FROM unnest(gallery_image_urls) url WHERE url !~* '^https://'
        ));

ALTER TABLE public.activities
    ADD CONSTRAINT activities_evidence_urls_https
        CHECK (evidence_urls IS NULL OR NOT EXISTS (
            SELECT 1 FROM unnest(evidence_urls) url WHERE url !~* '^https://'
        ));

-- Update indexes to match the user_id column name
DROP INDEX IF EXISTS idx_activities_student_status;
CREATE INDEX IF NOT EXISTS idx_activities_user_status ON public.activities (user_id, status);

-- Reflections capture narrative linked to a single activity
CREATE TABLE IF NOT EXISTS public.reflections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_reflections_user ON public.reflections (user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_activity ON public.reflections (activity_id);

-- Ensure updated_at columns stay fresh
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_portfolio_settings_updated_at ON public.portfolio_settings;
CREATE TRIGGER trg_portfolio_settings_updated_at
    BEFORE UPDATE ON public.portfolio_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_portfolio_custom_sections_updated_at ON public.portfolio_custom_sections;
CREATE TRIGGER trg_portfolio_custom_sections_updated_at
    BEFORE UPDATE ON public.portfolio_custom_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_reflections_updated_at ON public.reflections;
CREATE TRIGGER trg_reflections_updated_at
    BEFORE UPDATE ON public.reflections
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();

-- Ensure the dedicated hero image bucket exists with a 1MB file limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'portfolio-hero', 'portfolio-hero', false, 1048576, ARRAY['image/png','image/jpeg','image/gif','image/webp']
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'portfolio-hero'
);
