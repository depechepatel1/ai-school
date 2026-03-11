import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  SEMESTER_START,
  SEMESTER_WEEKS,
  getWeekNumber,
  getWeekDateRange,
  TIME_TARGETS,
  SCHOOL_DAYS_PER_WEEK,
} from "@/lib/semester";

export type Period = "daily" | "weekly" | "monthly" | "total";
type Activity = "shadowing" | "pronunciation" | "speaking";

export interface ActivityData {
  seconds: number;
  target: number;
  pct: number;
  overtime: number;
}

export interface AnalyticsPeriodData {
  shadowing: ActivityData;
  pronunciation: ActivityData;
  speaking: ActivityData;
  totalSeconds: number;
  totalTarget: number;
  /** For bar chart: array of { label, shadowing, pronunciation, speaking } */
  breakdown: { label: string; shadowing: number; pronunciation: number; speaking: number }[];
}


function buildActivityData(seconds: number, target: number): ActivityData {
  const pct = target > 0 ? Math.min(seconds / target, 1) : 0;
  const overtime = Math.max(0, seconds - target);
  return { seconds, target, pct, overtime };
}

export function useAnalyticsData(
  userId: string | null,
  courseType: "ielts" | "igcse" | null,
  period: Period,
) {
  const [data, setData] = useState<AnalyticsPeriodData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !courseType) { setLoading(false); return; }

    const fetch = async () => {
      setLoading(true);
      const targets = TIME_TARGETS[courseType] ?? TIME_TARGETS.igcse;
      const now = new Date();
      let rangeStart: Date;
      let rangeEnd: Date;
      let targetMultiplier = 1; // daily = 1

      const semStart = new Date(`${SEMESTER_START}T00:00:00`);
      const semEnd = new Date(semStart.getTime() + SEMESTER_WEEKS * 7 * 86_400_000);

      if (period === "daily") {
        rangeStart = new Date(now); rangeStart.setHours(0, 0, 0, 0);
        rangeEnd = new Date(now); rangeEnd.setHours(23, 59, 59, 999);
        targetMultiplier = 1;
      } else if (period === "weekly") {
        const wk = getWeekNumber(now) || 1;
        const r = getWeekDateRange(wk);
        rangeStart = r.start; rangeEnd = r.end;
        targetMultiplier = SCHOOL_DAYS_PER_WEEK;
      } else if (period === "monthly") {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        // ~4 weeks of school days
        targetMultiplier = SCHOOL_DAYS_PER_WEEK * 4;
      } else {
        // total — entire semester up to now
        rangeStart = semStart;
        rangeEnd = now > semEnd ? semEnd : now;
        const weeksElapsed = Math.max(1, getWeekNumber(now));
        targetMultiplier = SCHOOL_DAYS_PER_WEEK * weeksElapsed;
      }

      const { data: logs } = await supabase
        .from("student_practice_logs")
        .select("activity_type, active_seconds, created_at")
        .eq("user_id", userId)
        .gte("created_at", rangeStart.toISOString())
        .lte("created_at", rangeEnd.toISOString());

      const rows = logs ?? [];

      // Aggregate by activity
      const sums: Record<Activity, number> = { shadowing: 0, pronunciation: 0, speaking: 0 };
      const buckets: Record<string, Record<Activity, number>> = {};

      for (const row of rows) {
        const act = row.activity_type as Activity;
        if (sums[act] !== undefined) sums[act] += row.active_seconds;

        // Determine bucket label
        let label: string;
        const d = new Date(row.created_at);
        if (period === "daily") {
          const h = d.getHours();
          label = `${h}:00`;
        } else if (period === "weekly") {
          label = d.toLocaleDateString("en", { weekday: "short" });
        } else {
          // monthly / total — group by week number
          label = `W${getWeekNumber(d)}`;
        }

        if (!buckets[label]) buckets[label] = { shadowing: 0, pronunciation: 0, speaking: 0 };
        if (buckets[label][act] !== undefined) buckets[label][act] += row.active_seconds;
      }

      const breakdown = Object.entries(buckets).map(([label, vals]) => ({ label, ...vals }));

      const result: AnalyticsPeriodData = {
        shadowing: buildActivityData(sums.shadowing, targets.shadowing * targetMultiplier),
        pronunciation: buildActivityData(sums.pronunciation, targets.pronunciation * targetMultiplier),
        speaking: buildActivityData(sums.speaking, targets.speaking * targetMultiplier),
        totalSeconds: sums.shadowing + sums.pronunciation + sums.speaking,
        totalTarget: (targets.shadowing + targets.pronunciation + targets.speaking) * targetMultiplier,
        breakdown,
      };

      setData(result);
      setLoading(false);
    };

    fetch().catch(console.error);
  }, [userId, courseType, period]);

  return { data, loading };
}
