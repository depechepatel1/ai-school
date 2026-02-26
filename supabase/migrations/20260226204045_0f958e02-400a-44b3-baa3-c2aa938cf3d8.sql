
-- Track student progress per curriculum track
CREATE TABLE public.student_curriculum_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track TEXT NOT NULL,
  last_sort_order INTEGER NOT NULL DEFAULT 0,
  last_score SMALLINT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, track)
);

ALTER TABLE public.student_curriculum_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.student_curriculum_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress"
  ON public.student_curriculum_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
  ON public.student_curriculum_progress FOR UPDATE
  USING (user_id = auth.uid());

-- Teachers/parents can view student progress
CREATE POLICY "Teachers can view student progress"
  ON public.student_curriculum_progress FOR SELECT
  USING (is_teacher_of_student(auth.uid(), user_id));

CREATE POLICY "Parents can view child progress"
  ON public.student_curriculum_progress FOR SELECT
  USING (is_student_of_parent(auth.uid(), user_id));
