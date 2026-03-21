
-- Add a generated column for the date portion (immutable extraction via timezone-aware cast)
ALTER TABLE public.student_practice_logs
ADD COLUMN created_date date GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED;

-- Now create the unique index using the stored column
CREATE UNIQUE INDEX idx_unique_practice_log_per_day
ON public.student_practice_logs (user_id, activity_type, course_type, week_number, practice_mode, created_date);
