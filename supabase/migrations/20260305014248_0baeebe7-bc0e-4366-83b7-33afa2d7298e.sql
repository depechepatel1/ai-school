UPDATE storage.objects 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'), 
  '{mimetype}', 
  '"video/mp4"'
)
WHERE bucket_id = 'videos' 
  AND name LIKE 'loop-stack/%.mp4';