CREATE OR REPLACE FUNCTION public.get_extended_practice_leaderboard(
  _range_start timestamptz,
  _range_end timestamptz
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  extended_seconds bigint,
  rank bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_class AS (
    SELECT cm.class_id
    FROM class_memberships cm
    WHERE cm.user_id = auth.uid()
    LIMIT 1
  ),
  classmates AS (
    SELECT cm.user_id
    FROM class_memberships cm
    WHERE cm.class_id = (SELECT class_id FROM my_class)
  ),
  totals AS (
    SELECT
      ptl.student_id AS user_id,
      COALESCE(SUM(ptl.extended_time_seconds), 0) AS extended_seconds
    FROM practice_time_log ptl
    WHERE ptl.student_id IN (SELECT user_id FROM classmates)
      AND ptl.created_at >= _range_start
      AND ptl.created_at < _range_end
    GROUP BY ptl.student_id
  ),
  ranked AS (
    SELECT
      c.user_id,
      COALESCE(p.display_name, 'Student') AS display_name,
      p.avatar_url,
      COALESCE(t.extended_seconds, 0) AS extended_seconds,
      RANK() OVER (ORDER BY COALESCE(t.extended_seconds, 0) DESC) AS rank
    FROM classmates c
    LEFT JOIN totals t ON t.user_id = c.user_id
    LEFT JOIN profiles p ON p.id = c.user_id
  )
  SELECT ranked.user_id, ranked.display_name, ranked.avatar_url, ranked.extended_seconds, ranked.rank
  FROM ranked
  ORDER BY ranked.rank ASC, ranked.display_name ASC
  LIMIT 20;
$$;