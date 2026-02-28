
-- Create student_practice_logs table for tracking session durations
CREATE TABLE public.student_practice_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_type TEXT NOT NULL DEFAULT 'ielts',
  activity_type TEXT NOT NULL,
  week_number SMALLINT NOT NULL DEFAULT 1,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  target_seconds INTEGER NOT NULL DEFAULT 600,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Validation trigger for activity_type and course_type
CREATE OR REPLACE FUNCTION public.validate_practice_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.activity_type NOT IN ('shadowing', 'pronunciation', 'speaking') THEN
    RAISE EXCEPTION 'activity_type must be shadowing, pronunciation, or speaking';
  END IF;
  IF NEW.course_type NOT IN ('ielts', 'igcse') THEN
    RAISE EXCEPTION 'course_type must be ielts or igcse';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_practice_log_trigger
BEFORE INSERT OR UPDATE ON public.student_practice_logs
FOR EACH ROW EXECUTE FUNCTION public.validate_practice_log();

-- Update timestamp trigger
CREATE TRIGGER update_practice_logs_updated_at
BEFORE UPDATE ON public.student_practice_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.student_practice_logs ENABLE ROW LEVEL SECURITY;

-- Students can manage own logs
CREATE POLICY "Users can view own practice logs"
ON public.student_practice_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own practice logs"
ON public.student_practice_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own practice logs"
ON public.student_practice_logs FOR UPDATE
USING (user_id = auth.uid());

-- Teachers can view their students' logs
CREATE POLICY "Teachers can view student practice logs"
ON public.student_practice_logs FOR SELECT
USING (is_teacher_of_student(auth.uid(), user_id));

-- Parents can view child logs
CREATE POLICY "Parents can view child practice logs"
ON public.student_practice_logs FOR SELECT
USING (is_student_of_parent(auth.uid(), user_id));

-- Index for efficient lookups
CREATE INDEX idx_practice_logs_user_date ON public.student_practice_logs (user_id, created_at DESC);
CREATE INDEX idx_practice_logs_user_activity ON public.student_practice_logs (user_id, activity_type, week_number);
