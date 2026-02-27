
-- Create public videos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true);

-- Allow anyone to read from the videos bucket
CREATE POLICY "Public read access for videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos');

-- Allow service role (edge functions) to insert into videos bucket
CREATE POLICY "Service role can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'videos');
