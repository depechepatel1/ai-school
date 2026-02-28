
-- Step 1: Create curriculum storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('curriculum', 'curriculum', true);

-- RLS: anyone can read curriculum files
CREATE POLICY "Public read access for curriculum"
ON storage.objects FOR SELECT
USING (bucket_id = 'curriculum');

-- Authenticated users can upload (for edge function with service role, but also for admin)
CREATE POLICY "Authenticated users can upload curriculum"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'curriculum' AND auth.role() = 'authenticated');

-- Step 2: Add course_type to classes
ALTER TABLE public.classes ADD COLUMN course_type TEXT NOT NULL DEFAULT 'ielts';

-- Validation trigger for course_type
CREATE OR REPLACE FUNCTION public.validate_class_course_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.course_type NOT IN ('ielts', 'igcse') THEN
    RAISE EXCEPTION 'course_type must be ielts or igcse';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_class_course_type_trigger
BEFORE INSERT OR UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.validate_class_course_type();

-- Step 3: Add selected_week to profiles
ALTER TABLE public.profiles ADD COLUMN selected_week SMALLINT NOT NULL DEFAULT 1;
