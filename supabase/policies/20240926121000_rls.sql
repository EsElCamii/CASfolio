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
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_migrations ENABLE ROW LEVEL SECURITY;

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
    USING (student_id = auth.uid() OR public.is_admin());

CREATE POLICY activities_insert_policy
    ON public.activities
    FOR INSERT
    WITH CHECK (student_id = auth.uid() OR public.is_admin());

CREATE POLICY activities_update_policy
    ON public.activities
    FOR UPDATE
    USING (student_id = auth.uid() OR public.is_admin())
    WITH CHECK (student_id = auth.uid() OR public.is_admin());

CREATE POLICY activities_delete_policy
    ON public.activities
    FOR DELETE
    USING (student_id = auth.uid() OR public.is_admin());

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

-- ACTIVITY ASSETS TABLE POLICIES ------------------------------------------

DROP POLICY IF EXISTS activity_assets_select_policy ON public.activity_assets;
DROP POLICY IF EXISTS activity_assets_insert_policy ON public.activity_assets;
DROP POLICY IF EXISTS activity_assets_update_policy ON public.activity_assets;
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
        OR public.is_admin()
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
        OR public.is_admin()
    );

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

CREATE POLICY activity_assets_delete_policy
    ON public.activity_assets
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM public.activities a
            WHERE a.id = activity_id AND a.student_id = auth.uid()
        )
        OR public.is_admin()
    );

-- USER MIGRATIONS TABLE POLICIES -----------------------------------------

DROP POLICY IF EXISTS user_migrations_select_policy ON public.user_migrations;
DROP POLICY IF EXISTS user_migrations_insert_policy ON public.user_migrations;
DROP POLICY IF EXISTS user_migrations_update_policy ON public.user_migrations;
DROP POLICY IF EXISTS user_migrations_delete_policy ON public.user_migrations;

CREATE POLICY user_migrations_select_policy
    ON public.user_migrations
    FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_migrations_insert_policy
    ON public.user_migrations
    FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_migrations_update_policy
    ON public.user_migrations
    FOR UPDATE
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_migrations_delete_policy
    ON public.user_migrations
    FOR DELETE
    USING (user_id = auth.uid() OR public.is_admin());
