import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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
  breakdown: { label: string; shadowing: number; pronunciation: number; speaking: number }[];
}

function buildActivityData(seconds: number, target: number): ActivityData {
  const pct = target > 0 ? Math.min(seconds / target, 1) : 0;
  const overtime = Math.max(0, seconds - target);
  return { seconds, target, pct, overtime };
}

function computeRange(period: Period) {
  const now = new Date();
  const semStart = new Date(`${SEMESTER_START}T00:00:00`);
  const semEnd = new Date(semStart.getTime() + SEMESTER_WEEKS * 7 * 86_400_000);
  let rangeStart: Date;
  let rangeEnd: Date;
  let targetMultiplier = 1;

  if (period === "daily") {
    rangeStart = new Date(now); rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(now); rangeEnd.setHours(23, 59, 59, 999);
  } else if (period === "weekly") {
    const wk = getWeekNumber(now) || 1;
    const r = getWeekDateRange(wk);
    rangeStart = r.start; rangeEnd = r.end;
    targetMultiplier = SCHOOL_DAYS_PER_WEEK;
  } else if (period === "monthly") {
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    targetMultiplier = SCHOOL_DAYS_PER_WEEK * 4;
  } else {
    rangeStart = semStart;
    rangeEnd = now > semEnd ? semEnd : now;
    const weeksElapsed = Math.max(1, getWeekNumber(now));
    targetMultiplier = SCHOOL_DAYS_PER_WEEK * weeksElapsed;
  }
  return { rangeStart, rangeEnd, targetMultiplier };
}

export function useAnalyticsData(
  userId: string | null,
  courseType: "ielts" | "igcse" | null,
  period: Period,
) {
  const { rangeStart, rangeEnd, targetMultiplier } = computeRange(period);

  const { data = null, isLoading: loading } = useQuery({
    queryKey: ["analytics-data", userId, courseType, period],
    enabled: !!userId && !!courseType,
    staleTime: 30_000,
    queryFn: async (): Promise<AnalyticsPeriodData> => {
      const targets = TIME_TARGETS[courseType!] ?? TIME_TARGETS.igcse;

      // Limit to 500 rows to prevent payload bloat — TODO: implement proper pagination
      const { data: logs } = await supabase
        .from("student_practice_logs")
        .select("activity_type, active_seconds, created_at")
        .eq("user_id", userId!)
        .gte("created_at", rangeStart.toISOString())
        .lte("created_at", rangeEnd.toISOString())
        .range(0, 499);

      const rows = logs ?? [];
      const sums: Record<Activity, number> = { shadowing: 0, pronunciation: 0, speaking: 0 };
      const buckets: Record<string, Record<Activity, number>> = {};

      for (const row of rows) {
        const act = row.activity_type as Activity;
        if (sums[act] !== undefined) sums[act] += row.active_seconds;

        let label: string;
        const d = new Date(row.created_at);
        if (period === "daily") {
          label = `${d.getHours()}:00`;
        } else if (period === "weekly") {
          label = d.toLocaleDateString("en", { weekday: "short" });
        } else {
          label = `W${getWeekNumber(d)}`;
        }

        if (!buckets[label]) buckets[label] = { shadowing: 0, pronunciation: 0, speaking: 0 };
        if (buckets[label][act] !== undefined) buckets[label][act] += row.active_seconds;
      }

      const breakdown = Object.entries(buckets).map(([label, vals]) => ({ label, ...vals }));

      return {
        shadowing: buildActivityData(sums.shadowing, targets.shadowing * targetMultiplier),
        pronunciation: buildActivityData(sums.pronunciation, targets.pronunciation * targetMultiplier),
        speaking: buildActivityData(sums.speaking, targets.speaking * targetMultiplier),
        totalSeconds: sums.shadowing + sums.pronunciation + sums.speaking,
        totalTarget: (targets.shadowing + targets.pronunciation + targets.speaking) * targetMultiplier,
        breakdown,
      };
    },
  });

  return { data, loading };
}
