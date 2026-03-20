
CREATE TABLE public.mock_test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  week_number int,
  parts_completed text[] NOT NULL DEFAULT '{}',
  transcript text,
  overall_band text,
  criteria_scores jsonb,
  vocabulary_suggestions text[],
  accent text NOT NULL DEFAULT 'uk',
  duration_seconds int
);

ALTER TABLE public.mock_test_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own mock test sessions"
  ON public.mock_test_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mock test sessions"
  ON public.mock_test_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all mock test sessions"
  ON public.mock_test_sessions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view student mock test sessions"
  ON public.mock_test_sessions FOR SELECT TO authenticated
  USING (is_teacher_of_student(auth.uid(), user_id));

CREATE POLICY "Parents can view child mock test sessions"
  ON public.mock_test_sessions FOR SELECT TO authenticated
  USING (is_student_of_parent(auth.uid(), user_id));
