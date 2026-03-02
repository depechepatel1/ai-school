
-- Function: get per-class student engagement for teachers
CREATE OR REPLACE FUNCTION public.get_class_engagement(
  _class_id uuid,
  _range_start timestamptz,
  _range_end timestamptz
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  shadowing_seconds bigint,
  pronunciation_seconds bigint,
  speaking_seconds bigint,
  total_seconds bigint,
  session_count bigint,
  last_active timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow class owner (teacher) or admin
  WITH access_check AS (
    SELECT 1 WHERE is_teacher_of_class(auth.uid(), _class_id)
       OR has_role(auth.uid(), 'admin')
  ),
  members AS (
    SELECT cm.user_id
    FROM class_memberships cm, access_check
    WHERE cm.class_id = _class_id
  ),
  logs AS (
    SELECT
      spl.user_id,
      spl.activity_type,
      spl.active_seconds,
      spl.created_at
    FROM student_practice_logs spl
    WHERE spl.user_id IN (SELECT m.user_id FROM members m)
      AND spl.created_at >= _range_start
      AND spl.created_at < _range_end
  ),
  agg AS (
    SELECT
      m.user_id,
      COALESCE(SUM(l.active_seconds) FILTER (WHERE l.activity_type = 'shadowing'), 0) AS shadowing_seconds,
      COALESCE(SUM(l.active_seconds) FILTER (WHERE l.activity_type = 'pronunciation'), 0) AS pronunciation_seconds,
      COALESCE(SUM(l.active_seconds) FILTER (WHERE l.activity_type = 'speaking'), 0) AS speaking_seconds,
      COALESCE(SUM(l.active_seconds), 0) AS total_seconds,
      COUNT(l.active_seconds) AS session_count,
      MAX(l.created_at) AS last_active
    FROM members m
    LEFT JOIN logs l ON l.user_id = m.user_id
    GROUP BY m.user_id
  )
  SELECT
    a.user_id,
    COALESCE(p.display_name, 'Student') AS display_name,
    p.avatar_url,
    a.shadowing_seconds,
    a.pronunciation_seconds,
    a.speaking_seconds,
    a.total_seconds,
    a.session_count,
    a.last_active
  FROM agg a
  LEFT JOIN profiles p ON p.id = a.user_id
  ORDER BY a.total_seconds DESC;
$$;
