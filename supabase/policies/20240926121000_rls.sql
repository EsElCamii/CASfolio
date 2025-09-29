-- Helper function to detect admin users via JWT claim
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN coalesce(auth.jwt() ->> 'role', '') = 'admin';
END;
$$;

-- Enable Row Level Security on core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_custom_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES -----------------------------------------------------

CREATE POLICY users_select_policy
    ON public.users
    FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY users_insert_policy
    ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY users_update_policy
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Only admins may delete user rows deliberately
CREATE POLICY users_delete_admin_policy
    ON public.users
    FOR DELETE
    USING (public.is_admin());

-- ACTIVITIES TABLE POLICIES -------------------------------------------------

CREATE POLICY activities_select_policy
    ON public.activities
    FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY activities_insert_policy
    ON public.activities
    FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY activities_update_policy
    ON public.activities
    FOR UPDATE
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY activities_delete_policy
    ON public.activities
    FOR DELETE
    USING (user_id = auth.uid() OR public.is_admin());

-- PROFILES TABLE POLICIES --------------------------------------------------

CREATE POLICY profiles_select_policy
    ON public.profiles
    FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_upsert_policy
    ON public.profiles
    FOR ALL
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- PORTFOLIO SETTINGS TABLE POLICIES ---------------------------------------

CREATE POLICY portfolio_settings_select_policy
    ON public.portfolio_settings
    FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY portfolio_settings_upsert_policy
    ON public.portfolio_settings
    FOR ALL
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- PORTFOLIO CUSTOM SECTIONS POLICIES --------------------------------------

CREATE POLICY portfolio_custom_sections_select_policy
    ON public.portfolio_custom_sections
    FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY portfolio_custom_sections_insert_policy
    ON public.portfolio_custom_sections
    FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY portfolio_custom_sections_update_policy
    ON public.portfolio_custom_sections
    FOR UPDATE
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY portfolio_custom_sections_delete_policy
    ON public.portfolio_custom_sections
    FOR DELETE
    USING (user_id = auth.uid() OR public.is_admin());

-- REFLECTIONS TABLE POLICIES ----------------------------------------------

CREATE POLICY reflections_select_policy
    ON public.reflections
    FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY reflections_insert_policy
    ON public.reflections
    FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY reflections_update_policy
    ON public.reflections
    FOR UPDATE
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY reflections_delete_policy
    ON public.reflections
    FOR DELETE
    USING (user_id = auth.uid() OR public.is_admin());

-- REVIEW REQUESTS TABLE POLICIES -------------------------------------------

CREATE POLICY review_requests_select_policy
    ON public.review_requests
    FOR SELECT
    USING (student_id = auth.uid() OR public.is_admin());

CREATE POLICY review_requests_insert_policy
    ON public.review_requests
    FOR INSERT
    WITH CHECK (student_id = auth.uid() OR public.is_admin());

CREATE POLICY review_requests_update_policy
    ON public.review_requests
    FOR UPDATE
    USING (student_id = auth.uid() OR public.is_admin())
    WITH CHECK (student_id = auth.uid() OR public.is_admin());

CREATE POLICY review_requests_delete_policy
    ON public.review_requests
    FOR DELETE
    USING (student_id = auth.uid() OR public.is_admin());

-- STORAGE POLICIES FOR HERO IMAGES ----------------------------------------

INSERT INTO storage.policies (bucket_id, name, definition, action)
VALUES
    ('portfolio-hero', 'hero_read', 'auth.uid() = owner', 'read'),
    ('portfolio-hero', 'hero_write', 'auth.uid() = owner', 'write'),
    ('portfolio-hero', 'hero_update', 'auth.uid() = owner', 'update'),
    ('portfolio-hero', 'hero_delete', 'auth.uid() = owner', 'delete')
ON CONFLICT (bucket_id, name) DO NOTHING;
