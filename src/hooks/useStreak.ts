import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StreakData {
  currentStreak: number;
  loading: boolean;
}

/**
 * Calculates the current consecutive-day practice streak
 * by querying distinct session_date values from practice_time_log.
 */
export function useStreak(userId: string | null): StreakData {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function calculate() {
      // Fetch last 60 days of distinct session dates, ordered descending
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data, error } = await supabase
        .from("practice_time_log")
        .select("session_date")
        .eq("student_id", userId)
        .gte("session_date", sixtyDaysAgo.toISOString().split("T")[0])
        .order("session_date", { ascending: false });

      if (cancelled || error) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Get unique dates
      const uniqueDates = [...new Set((data ?? []).map((r) => r.session_date))].sort(
        (a, b) => b.localeCompare(a)
      );

      if (uniqueDates.length === 0) {
        setCurrentStreak(0);
        setLoading(false);
        return;
      }

      // Count consecutive days starting from today or yesterday
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const firstDate = new Date(uniqueDates[0] + "T00:00:00");

      // Streak must include today or yesterday to be active
      if (firstDate < yesterday) {
        setCurrentStreak(0);
        setLoading(false);
        return;
      }

      let streak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1] + "T00:00:00");
        const curr = new Date(uniqueDates[i] + "T00:00:00");
        const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }

      if (!cancelled) {
        setCurrentStreak(streak);
        setLoading(false);
      }
    }

    calculate();
    return () => { cancelled = true; };
  }, [userId]);

  return { currentStreak, loading };
}
