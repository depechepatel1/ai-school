import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Accent } from "@/components/speaking/AccentSelector";

export function useAccent(userId: string | null) {
  const [accent, setAccentState] = useState<Accent>("uk");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("accent")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data?.accent === "us" || data?.accent === "uk") {
          setAccentState(data.accent);
        }
        setLoaded(true);
      });
  }, [userId]);

  const setAccent = useCallback(
    (newAccent: Accent) => {
      setAccentState(newAccent);
      if (!userId) return;
      supabase
        .from("profiles")
        .update({ accent: newAccent })
        .eq("id", userId)
        .then();
    },
    [userId]
  );

  return { accent, setAccent, loaded };
}
