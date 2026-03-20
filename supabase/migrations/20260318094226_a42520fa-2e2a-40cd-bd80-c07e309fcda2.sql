
-- Analytics event logging table
CREATE TABLE public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_name text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  session_id text,
  country text,
  device_id text,
  app_version text,
  deployment_region text NOT NULL DEFAULT 'global',
  course_type text,
  platform text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by user
CREATE INDEX idx_user_events_user_id ON public.user_events(user_id);

-- Index for querying by event name + time range
CREATE INDEX idx_user_events_name_created ON public.user_events(event_name, created_at DESC);

-- Index for admin analytics queries
CREATE INDEX idx_user_events_created ON public.user_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events
CREATE POLICY "Users can insert own events"
  ON public.user_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view their own events
CREATE POLICY "Users can view own events"
  ON public.user_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all events
CREATE POLICY "Admins can view all events"
  ON public.user_events
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view student events
CREATE POLICY "Teachers can view student events"
  ON public.user_events
  FOR SELECT
  TO authenticated
  USING (is_teacher_of_student(auth.uid(), user_id));
