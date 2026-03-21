import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExtendedLeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  extended_seconds: number;
  rank: number;
}

export function useExtendedLeaderboard(
  userId: string | null,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const [entries, setEntries] = useState<ExtendedLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_extended_practice_leaderboard", {
        _range_start: rangeStart.toISOString(),
        _range_end: rangeEnd.toISOString(),
      });

      if (!error && data) {
        setEntries(
          (data as { user_id: string; display_name: string; avatar_url: string | null; extended_seconds: number; rank: number }[]).map((r) => ({
            user_id: r.user_id,
            display_name: r.display_name ?? "Student",
            avatar_url: r.avatar_url,
            extended_seconds: Number(r.extended_seconds),
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
