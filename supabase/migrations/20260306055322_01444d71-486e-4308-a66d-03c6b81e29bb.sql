
-- ============================================================
-- Step 1.1: Create 'curriculums' storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculums', 'curriculums', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can read
CREATE POLICY "Authenticated users can read curriculums"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'curriculums');

-- Storage RLS: admins can upload
CREATE POLICY "Admins can upload curriculums"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'curriculums'
  AND public.has_role(auth.uid(), 'admin')
);

-- Storage RLS: teachers can upload
CREATE POLICY "Teachers can upload curriculums"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'curriculums'
  AND public.has_role(auth.uid(), 'teacher')
);

-- Storage RLS: admins can update
CREATE POLICY "Admins can update curriculums"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'curriculums'
  AND public.has_role(auth.uid(), 'admin')
);

-- Storage RLS: admins can delete
CREATE POLICY "Admins can delete curriculums"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'curriculums'
  AND public.has_role(auth.uid(), 'admin')
);

-- ============================================================
-- Step 1.2: Create 4 database tables
-- ============================================================

-- 1) curriculum_metadata
CREATE TABLE public.curriculum_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_type text NOT NULL,
  module_type text NOT NULL,
  file_path text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.curriculum_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read curriculum_metadata"
ON public.curriculum_metadata FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert curriculum_metadata"
ON public.curriculum_metadata FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can insert curriculum_metadata"
ON public.curriculum_metadata FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can update curriculum_metadata"
ON public.curriculum_metadata FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete curriculum_metadata"
ON public.curriculum_metadata FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2) student_progress
CREATE TABLE public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_type text NOT NULL,
  module_type text NOT NULL,
  current_position jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_accessed timestamptz DEFAULT now(),
  UNIQUE (student_id, course_type, module_type)
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own progress"
ON public.student_progress FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Students can insert own progress"
ON public.student_progress FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own progress"
ON public.student_progress FOR UPDATE
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Teachers can read student progress"
ON public.student_progress FOR SELECT
TO authenticated
USING (public.is_teacher_of_student(auth.uid(), student_id));

CREATE POLICY "Parents can read child progress"
ON public.student_progress FOR SELECT
TO authenticated
USING (public.is_student_of_parent(auth.uid(), student_id));

CREATE POLICY "Admins can read all progress"
ON public.student_progress FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3) practice_time_log
CREATE TABLE public.practice_time_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_type text NOT NULL,
  module_type text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  required_time_seconds integer NOT NULL DEFAULT 0,
  extended_time_seconds integer NOT NULL DEFAULT 0,
  total_time_seconds integer NOT NULL DEFAULT 0,
  week_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_time_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own time logs"
ON public.practice_time_log FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Students can insert own time logs"
ON public.practice_time_log FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can read student time logs"
ON public.practice_time_log FOR SELECT
TO authenticated
USING (public.is_teacher_of_student(auth.uid(), student_id));

CREATE POLICY "Parents can read child time logs"
ON public.practice_time_log FOR SELECT
TO authenticated
USING (public.is_student_of_parent(auth.uid(), student_id));

CREATE POLICY "Admins can read all time logs"
ON public.practice_time_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4) timer_settings
CREATE TABLE public.timer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_type text NOT NULL,
  module_type text NOT NULL,
  countdown_minutes integer NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_type, module_type)
);

ALTER TABLE public.timer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read timer_settings"
ON public.timer_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert timer_settings"
ON public.timer_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update timer_settings"
ON public.timer_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed timer_settings
INSERT INTO public.timer_settings (course_type, module_type, countdown_minutes) VALUES
  ('ielts', 'shadowing-pronunciation', 5),
  ('ielts', 'shadowing-fluency', 10),
  ('ielts', 'speaking', 12),
  ('igcse', 'shadowing-pronunciation', 5),
  ('igcse', 'shadowing-fluency', 10),
  ('igcse', 'speaking', 10);
