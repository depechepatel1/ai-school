import { useState, useEffect } from "react";
import { fetchStreakData } from "@/services/db";

export function useStreak(userId: string | null) {
  const [streak, setStreak] = useState(0);
  const [restDays, setRestDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchStreakData(userId)
      .then(({ streak, restDays }) => {
        setStreak(streak);
        setRestDays(restDays);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  return { streak, restDays, loading };
}
