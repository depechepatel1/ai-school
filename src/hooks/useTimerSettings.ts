/**
 * Hook to fetch timer settings from the database.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTimerSettings(courseType: string | null, moduleType: string) {
  const [countdownMinutes, setCountdownMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseType) { setLoading(false); return; }

    (async () => {
      try {
        const { data } = await supabase
          .from("timer_settings")
          .select("countdown_minutes")
          .eq("course_type", courseType)
          .eq("module_type", moduleType)
          .maybeSingle();

        if (data) {
          setCountdownMinutes(data.countdown_minutes);
        }
      } catch (err) {
        console.error("useTimerSettings error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseType, moduleType]);

  return { countdownMinutes, loading };
}
