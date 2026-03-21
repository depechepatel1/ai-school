import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getWeekNumber, getWeekDateRange, SCHOOL_DAYS_PER_WEEK, TIME_TARGETS } from "@/lib/semester";

export interface WeeklyReport {
  /** Homework seconds per module this week */
  homework: { shadowing: number; pronunciation: number; speaking: number };
  /** Extended (free practice) seconds this week */
  extendedTotal: number;
  /** Past 4 weeks chart data */
  weeklyChart: { week: string; homework: number; extended: number }[];
  /** Current leaderboard rank (0 if unavailable) */
  leaderboardRank: number;
}

export function useStudentReport(
  userId: string | null,
  courseType: "ielts" | "igcse" | null,
) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !courseType) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      const currentWeek = getWeekNumber();
      const weeksToFetch = [currentWeek, currentWeek - 1, currentWeek - 2, currentWeek - 3].filter((w) => w > 0);

      // Fetch all practice logs for past 4 weeks
      const earliest = getWeekDateRange(Math.min(...weeksToFetch));
      const latest = getWeekDateRange(Math.max(...weeksToFetch));

      const { data: logs } = await supabase
        .from("student_practice_logs")
        .select("activity_type, active_seconds, practice_mode, week_number, created_at")
        .eq("user_id", userId)
        .gte("created_at", earliest.start.toISOString())
        .lt("created_at", latest.end.toISOString());

      // Fetch extended time from practice_time_log
      const { data: timeLogs } = await supabase
        .from("practice_time_log")
        .select("extended_time_seconds, required_time_seconds, week_number, module_type, created_at")
        .eq("student_id", userId)
        .gte("created_at", earliest.start.toISOString())
        .lt("created_at", latest.end.toISOString());

      const rows = logs ?? [];
      const timeRows = timeLogs ?? [];

      // Current week homework breakdown
      const homework = { shadowing: 0, pronunciation: 0, speaking: 0 };
      for (const r of rows) {
        if (r.week_number === currentWeek && r.practice_mode === "homework") {
          const act = r.activity_type as keyof typeof homework;
          if (homework[act] !== undefined) homework[act] += r.active_seconds;
        }
      }

      // Current week extended total
      let extendedTotal = 0;
      for (const r of timeRows) {
        if (r.week_number === currentWeek) {
          extendedTotal += r.extended_time_seconds;
        }
      }

      // 4-week chart
      const weeklyChart = weeksToFetch.reverse().map((w) => {
        let hw = 0;
        let ext = 0;
        for (const r of rows) {
          if (r.week_number === w && r.practice_mode === "homework") hw += r.active_seconds;
        }
        for (const r of timeRows) {
          if (r.week_number === w) ext += r.extended_time_seconds;
        }
        return { week: `W${w}`, homework: hw, extended: ext };
      });

      // Leaderboard rank
      let leaderboardRank = 0;
      try {
        const now = new Date();
        const wkRange = getWeekDateRange(currentWeek);
        const { data: lb } = await supabase.rpc("get_class_leaderboard", {
          _range_start: wkRange.start.toISOString(),
          _range_end: wkRange.end.toISOString(),
        });
        if (lb) {
          const entries = lb as { user_id: string; rank: number }[];
          const me = entries.find((e) => e.user_id === userId);
          if (me) leaderboardRank = Number(me.rank);
        }
      } catch {}

      setReport({ homework, extendedTotal, weeklyChart, leaderboardRank });
      setLoading(false);
    };

    load().catch(console.error);
  }, [userId, courseType]);

  return { report, loading };
}
