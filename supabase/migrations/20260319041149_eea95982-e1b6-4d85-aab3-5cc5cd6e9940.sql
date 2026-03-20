
-- Allow admins to upload (INSERT) files to the videos bucket
CREATE POLICY "Admins can insert video files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to update (replace) files in the videos bucket
CREATE POLICY "Admins can update video files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'videos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
