-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Domain specific enum types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_status') THEN
        CREATE TYPE public.activity_status AS ENUM ('draft', 'pending', 'completed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END$$;

-- Users table holds CAS profile data synced with Supabase auth users
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    display_name text,
    cas_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Activities authored by a specific student
CREATE TABLE IF NOT EXISTS public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    status public.activity_status NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_activities_student_status ON public.activities (student_id, status);

-- Verification requests raised by students for teacher review
CREATE TABLE IF NOT EXISTS public.review_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status public.review_status NOT NULL DEFAULT 'pending',
    assessor_notes text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_review_requests_student_status ON public.review_requests (student_id, status);
CREATE INDEX IF NOT EXISTS idx_review_requests_activity ON public.review_requests (activity_id);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at := timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_activities_updated_at ON public.activities;
CREATE TRIGGER trg_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_review_requests_updated_at ON public.review_requests;
CREATE TRIGGER trg_review_requests_updated_at
    BEFORE UPDATE ON public.review_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();
