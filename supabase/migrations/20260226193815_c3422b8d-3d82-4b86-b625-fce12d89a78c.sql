
-- Curriculum items for shadowing/pronunciation practice
CREATE TABLE public.curriculum_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track text NOT NULL CHECK (track IN ('pronunciation', 'fluency')),
  band_level smallint NOT NULL CHECK (band_level BETWEEN 1 AND 9),
  topic text NOT NULL DEFAULT 'General',
  sentence text NOT NULL,
  audio_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast filtering
CREATE INDEX idx_curriculum_track_band ON public.curriculum_items (track, band_level);

-- Enable RLS - curriculum is public/read-only for all authenticated users
ALTER TABLE public.curriculum_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read curriculum"
  ON public.curriculum_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Only teachers can manage curriculum
CREATE POLICY "Teachers can insert curriculum"
  ON public.curriculum_items
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can update curriculum"
  ON public.curriculum_items
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can delete curriculum"
  ON public.curriculum_items
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role));
