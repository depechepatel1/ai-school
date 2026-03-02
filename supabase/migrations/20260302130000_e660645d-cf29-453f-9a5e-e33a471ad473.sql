
-- Add practice_mode column to student_practice_logs
ALTER TABLE public.student_practice_logs
  ADD COLUMN practice_mode text NOT NULL DEFAULT 'homework';

-- Replace the validation trigger to also check practice_mode
CREATE OR REPLACE FUNCTION public.validate_practice_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.activity_type NOT IN ('shadowing', 'pronunciation', 'speaking') THEN
    RAISE EXCEPTION 'activity_type must be shadowing, pronunciation, or speaking';
  END IF;
  IF NEW.course_type NOT IN ('ielts', 'igcse') THEN
    RAISE EXCEPTION 'course_type must be ielts or igcse';
  END IF;
  IF NEW.practice_mode NOT IN ('homework', 'independent') THEN
    RAISE EXCEPTION 'practice_mode must be homework or independent';
  END IF;
  RETURN NEW;
END;
$function$;
