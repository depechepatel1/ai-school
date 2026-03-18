import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { analytics } from "@/services/analytics";

interface StreakData {
  currentStreak: number;
  loading: boolean;
}

function computeStreak(dates: string[]): number {
  const uniqueDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  if (uniqueDates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const firstDate = new Date(uniqueDates[0] + "T00:00:00");
  if (firstDate < yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1] + "T00:00:00");
    const curr = new Date(uniqueDates[i] + "T00:00:00");
    if ((prev.getTime() - curr.getTime()) / 86_400_000 === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Calculates the current consecutive-day practice streak
 * by querying distinct session_date values from practice_time_log.
 */
export function useStreak(userId: string | null): StreakData {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const cutoff = sixtyDaysAgo.toISOString().split("T")[0];

  const { data: currentStreak = 0, isLoading: loading } = useQuery({
    queryKey: ["streak", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_time_log")
        .select("session_date")
        .eq("student_id", userId!)
        .gte("session_date", cutoff)
        .order("session_date", { ascending: false });

      if (error) return 0;
      return computeStreak((data ?? []).map((r) => r.session_date));
    },
  });

  return { currentStreak, loading };
}
