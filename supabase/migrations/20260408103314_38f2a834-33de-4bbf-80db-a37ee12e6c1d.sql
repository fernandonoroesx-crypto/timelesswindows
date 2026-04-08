-- Make the logo bucket public
UPDATE storage.buckets SET public = true WHERE id = 'logo';

-- Allow anyone to read files from the logo bucket
CREATE POLICY "Public read access on logo bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logo');
