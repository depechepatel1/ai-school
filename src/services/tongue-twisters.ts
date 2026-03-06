/**
 * Fetch tongue twisters from the curriculums bucket or local fallback.
 */
import { supabase } from "@/integrations/supabase/client";

export interface TongueTwister {
  id: number;
  text: string;
  difficulty: number;
}

const cache: TongueTwister[] | null = null;

export async function fetchTongueTwisters(): Promise<TongueTwister[]> {
  if (cache) return cache;

  // Try storage bucket first
  const { data: urlData } = supabase.storage
    .from("curriculums")
    .getPublicUrl("shared/tongue-twisters.json");

  if (urlData?.publicUrl) {
    try {
      const res = await fetch(urlData.publicUrl);
      if (res.ok) return await res.json();
    } catch { /* fall through */ }
  }

  // Try curriculum bucket
  const { data: urlData2 } = supabase.storage
    .from("curriculum")
    .getPublicUrl("tongue-twisters.json");

  if (urlData2?.publicUrl) {
    try {
      const res = await fetch(urlData2.publicUrl);
      if (res.ok) return await res.json();
    } catch { /* fall through */ }
  }

  // Fallback: local
  const res = await fetch("/data/tongue-twisters.json");
  if (!res.ok) throw new Error("Failed to load tongue twisters");
  return await res.json();
}
