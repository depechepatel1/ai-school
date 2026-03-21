
-- Cleanup guards (safety net for any orphaned rows)
DELETE FROM public.student_curriculum_progress WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.practice_time_log WHERE student_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.student_progress WHERE student_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.timer_settings WHERE updated_by IS NOT NULL AND updated_by NOT IN (SELECT id FROM auth.users);

-- Add foreign key constraints
ALTER TABLE public.student_curriculum_progress
  ADD CONSTRAINT fk_scp_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.practice_time_log
  ADD CONSTRAINT fk_ptl_student FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.student_progress
  ADD CONSTRAINT fk_sp_student FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.timer_settings
  ADD CONSTRAINT fk_ts_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
