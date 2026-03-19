
-- Allow admins to delete files from the videos bucket
CREATE POLICY "Admins can delete video files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
