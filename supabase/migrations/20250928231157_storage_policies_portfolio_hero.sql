-- Storage policies for portfolio-hero bucket (user-scoped uploads)
  -- Safe/idempotent: drops any existing conflicting policies, then recreates.

  -- Ensure bucket exists (in case previous migration didn't run)
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  SELECT 'portfolio-hero', 'portfolio-hero', false, 1048576, ARRAY['image/png','image/jpeg','image/gif','image/webp']
  WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'portfolio-hero'
  );

  -- Note: RLS on storage.objects is managed by Supabase and typically enabled by default.

  -- Drop old policies if present (avoids duplicates when re-running)
  DROP POLICY IF EXISTS portfolio_hero_select_own ON storage.objects;
  DROP POLICY IF EXISTS portfolio_hero_insert_own ON storage.objects;
  DROP POLICY IF EXISTS portfolio_hero_update_own ON storage.objects;
  DROP POLICY IF EXISTS portfolio_hero_delete_own ON storage.objects;

-- Policy: users can read only their own hero images inside their UID folder
CREATE POLICY portfolio_hero_select_own
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'portfolio-hero'
    AND owner = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Policy: users can upload only under their own UID prefix (e.g., <uid>/hero-*.png)
CREATE POLICY portfolio_hero_insert_own
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio-hero'
    AND owner = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Policy: users can update only their own objects in their folder
CREATE POLICY portfolio_hero_update_own
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'portfolio-hero'
    AND owner = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'portfolio-hero'
    AND owner = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Policy: users can delete only their own objects in their folder
CREATE POLICY portfolio_hero_delete_own
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'portfolio-hero'
    AND owner = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
  );
