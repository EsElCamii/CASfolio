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
