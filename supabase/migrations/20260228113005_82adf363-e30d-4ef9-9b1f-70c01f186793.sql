
-- Security definer function: returns leaderboard for the calling student's class
-- Aggregates total practice seconds within a date range for all classmates
CREATE OR REPLACE FUNCTION public.get_class_leaderboard(
  _range_start timestamptz,
  _range_end timestamptz
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  total_seconds bigint,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
      spl.user_id,
      COALESCE(SUM(spl.active_seconds), 0) AS total_seconds
    FROM student_practice_logs spl
    WHERE spl.user_id IN (SELECT user_id FROM classmates)
      AND spl.created_at >= _range_start
      AND spl.created_at < _range_end
    GROUP BY spl.user_id
  ),
  ranked AS (
    SELECT
      c.user_id,
      COALESCE(p.display_name, 'Student') AS display_name,
      p.avatar_url,
      COALESCE(t.total_seconds, 0) AS total_seconds,
      RANK() OVER (ORDER BY COALESCE(t.total_seconds, 0) DESC) AS rank
    FROM classmates c
    LEFT JOIN totals t ON t.user_id = c.user_id
    LEFT JOIN profiles p ON p.id = c.user_id
  )
  SELECT ranked.user_id, ranked.display_name, ranked.avatar_url, ranked.total_seconds, ranked.rank
  FROM ranked
  ORDER BY ranked.rank ASC, ranked.display_name ASC
  LIMIT 20;
$$;
