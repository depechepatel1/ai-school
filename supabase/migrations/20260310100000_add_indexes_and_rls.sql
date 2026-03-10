-- Add performance indexes for commonly queried tables

-- practice_time_log: queried by student + date range, and by course_type/module_type
CREATE INDEX IF NOT EXISTS idx_practice_time_log_student_date
  ON practice_time_log (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_time_log_course_module
  ON practice_time_log (course_type, module_type);

CREATE INDEX IF NOT EXISTS idx_practice_time_log_session_week
  ON practice_time_log (session_date, week_number);

-- curriculum_metadata: queried by course/module/active status
CREATE INDEX IF NOT EXISTS idx_curriculum_metadata_lookup
  ON curriculum_metadata (course_type, module_type, is_active DESC, uploaded_at DESC);

-- student_practice_logs: queried by user + date
CREATE INDEX IF NOT EXISTS idx_student_practice_logs_user_date
  ON student_practice_logs (user_id, created_at DESC);

-- student_curriculum_progress: queried by user + track
CREATE INDEX IF NOT EXISTS idx_student_curriculum_progress_lookup
  ON student_curriculum_progress (user_id, track);

-- Add RLS UPDATE policy for practice_time_log (students can update their own records)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'practice_time_log' AND policyname = 'Students can update own practice logs'
  ) THEN
    CREATE POLICY "Students can update own practice logs"
      ON practice_time_log FOR UPDATE
      USING (auth.uid() = student_id)
      WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;

-- Add RLS DELETE policy for practice_time_log (students can delete their own records)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'practice_time_log' AND policyname = 'Students can delete own practice logs'
  ) THEN
    CREATE POLICY "Students can delete own practice logs"
      ON practice_time_log FOR DELETE
      USING (auth.uid() = student_id);
  END IF;
END $$;
