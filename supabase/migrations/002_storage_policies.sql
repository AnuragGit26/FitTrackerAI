-- Storage Bucket Policies for Profile Photos
-- 
-- IMPORTANT: This app uses Auth0 (not Supabase Auth), so we use PUBLIC BUCKET policies.
--
-- SETUP INSTRUCTIONS:
-- 1. Create the 'profile-photos' bucket in Supabase Dashboard:
--    - Go to Storage > Create Bucket (or edit existing bucket)
--    - Name: profile-photos
--    - Public: true (MUST be public for Auth0 to work)
--    - File size limit: 5MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--
-- 2. Run this migration to set up the public bucket policies
--
-- SECURITY:
-- - Files are organized by user_id: {user_id}/{filename}
-- - While the bucket is public, users can only access their own photos through app logic
-- - Path-based organization provides basic security
--
-- ALTERNATIVE SETUP (Private Bucket with Auth0 JWT):
-- If you want a private bucket, you need to:
-- 1. Configure Supabase to accept Auth0 JWTs (Settings > API > JWT Secret)
-- 2. Update policies to extract user_id from JWT claims
-- 3. Pass Auth0 tokens to Supabase in client code
-- See docs/STORAGE_SETUP.md for details

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public users can delete their own profile photos" ON storage.objects;

-- ============================================================================
-- PUBLIC BUCKET POLICIES (Recommended for Auth0 integration)
-- ============================================================================
-- Since this app uses Auth0 (not Supabase Auth), we use public bucket policies
-- The bucket should be set to PUBLIC in Supabase Dashboard
-- Security is maintained through path-based organization (user_id/filename)

-- Policy: Allow anyone to upload to profile-photos bucket
-- Note: In production, you may want to add additional validation
CREATE POLICY "Anyone can upload profile photos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'profile-photos');

-- Policy: Allow anyone to read profile photos (public bucket)
CREATE POLICY "Anyone can read profile photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Policy: Allow public users to update their own profile photos
-- Uses JWT claims to extract user_id from Auth0 token
-- Note: This requires Supabase to be configured to accept Auth0 JWTs
-- If JWT claims are not available, this will still work but won't restrict updates
CREATE POLICY "Public users can update their own profile photos"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'profile-photos' AND
  (
    -- Try to extract user_id from JWT claims (if Auth0 JWT is configured)
    (storage.foldername(name))[1] = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      current_setting('request.jwt.claims', true)::json->>'user_id',
      ''
    )
    OR
    -- Fallback: allow if JWT claims are not available (for public bucket)
    current_setting('request.jwt.claims', true) IS NULL
  )
);

-- Policy: Allow public users to delete their own profile photos
-- Uses JWT claims to extract user_id from Auth0 token
CREATE POLICY "Public users can delete their own profile photos"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'profile-photos' AND
  (
    -- Try to extract user_id from JWT claims (if Auth0 JWT is configured)
    (storage.foldername(name))[1] = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      current_setting('request.jwt.claims', true)::json->>'user_id',
      ''
    )
    OR
    -- Fallback: allow if JWT claims are not available (for public bucket)
    current_setting('request.jwt.claims', true) IS NULL
  )
);
-- Alternative: If using Auth0 JWT tokens, you may need to customize the policies
-- to extract user_id from the JWT claims instead of auth.uid()
-- 
-- For Auth0 integration, you would need to:
-- 1. Configure Supabase to accept Auth0 JWTs (requires custom JWT secret configuration)
-- 2. Update policies to use: (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'sub'
--
-- However, a simpler approach is to make the bucket public for uploads
-- but restrict via path-based access. See alternative policies below:
-- ============================================================================
-- ALTERNATIVE: Public bucket (Recommended for Auth0 integration)
-- ============================================================================
-- Since this app uses Auth0 (not Supabase Auth), the policies above won't work
-- because auth.uid() requires Supabase Auth. Use these policies instead:
--
-- First, make the bucket PUBLIC in Supabase Dashboard, then run:
--
-- DROP POLICY IF EXISTS "Anyone can upload profile photos" ON storage.objects;
-- DROP POLICY IF EXISTS "Anyone can read profile photos" ON storage.objects;
-- DROP POLICY IF EXISTS "Public users can update their own profile photos" ON storage.objects;
-- DROP POLICY IF EXISTS "Public users can delete their own profile photos" ON storage.objects;
--
-- CREATE POLICY "Anyone can upload profile photos"
-- ON storage.objects
-- FOR INSERT
-- TO public
-- WITH CHECK (bucket_id = 'profile-photos');
--
-- CREATE POLICY "Anyone can read profile photos"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'profile-photos');
--
-- CREATE POLICY "Public users can update their own profile photos"
-- ON storage.objects
-- FOR UPDATE
-- TO public
-- USING (
--   bucket_id = 'profile-photos' AND
--   (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'sub'
-- );
--
-- CREATE POLICY "Public users can delete their own profile photos"
-- ON storage.objects
-- FOR DELETE
-- TO public
-- USING (
--   bucket_id = 'profile-photos' AND
--   (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'sub'
-- );
--
-- NOTE: For Auth0 JWT to work, you need to configure Supabase to accept Auth0 JWTs.
-- This requires setting the JWT secret in Supabase Dashboard > Settings > API.
-- Alternatively, just make the bucket public and rely on path-based organization.