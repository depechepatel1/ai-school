import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_seconds: number;
  rank: number;
}

export function useClassLeaderboard(
  userId: string | null,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_class_leaderboard", {
        _range_start: rangeStart.toISOString(),
        _range_end: rangeEnd.toISOString(),
      });

      if (!error && data) {
        setEntries(
          (data as any[]).map((r) => ({
            user_id: r.user_id,
            display_name: r.display_name ?? "Student",
            avatar_url: r.avatar_url,
            total_seconds: Number(r.total_seconds),
            rank: Number(r.rank),
          })),
        );
      }
      setLoading(false);
    };

    load().catch(console.error);
  }, [userId, rangeStart.getTime(), rangeEnd.getTime()]);

  return { entries, loading };
}
