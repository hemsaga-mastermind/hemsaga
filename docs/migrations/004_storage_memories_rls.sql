-- Hemsaga: direct browser access to bucket `memories` should be disabled.
-- The app uses /api/upload + service role and signed URLs from API routes only.
--
-- Steps:
-- 1) Supabase Dashboard → Storage → bucket `memories` → turn OFF "Public bucket".
-- 2) SQL Editor: drop conflicting policies on storage.objects if needed, then run below.
--
-- Semantics: anon/authenticated may only touch rows where bucket_id IS NOT 'memories'.
-- If this is your only bucket, they effectively have no Storage access (good).

CREATE POLICY "memories_anon_no_select"
ON storage.objects FOR SELECT TO anon
USING (bucket_id <> 'memories');

CREATE POLICY "memories_anon_no_insert"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id <> 'memories');

CREATE POLICY "memories_anon_no_update"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id <> 'memories')
WITH CHECK (bucket_id <> 'memories');

CREATE POLICY "memories_anon_no_delete"
ON storage.objects FOR DELETE TO anon
USING (bucket_id <> 'memories');

CREATE POLICY "memories_auth_no_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id <> 'memories');

CREATE POLICY "memories_auth_no_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id <> 'memories');

CREATE POLICY "memories_auth_no_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id <> 'memories')
WITH CHECK (bucket_id <> 'memories');

CREATE POLICY "memories_auth_no_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id <> 'memories');
