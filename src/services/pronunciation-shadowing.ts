/**
 * Fetch pronunciation shadowing items from the curriculums bucket or local fallback.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PronunciationItem {
  id: number;
  text: string;
  difficulty: number;
}

let cache: PronunciationItem[] | null = null;

export function clearPronunciationCache(): void {
  cache = null;
}

export async function fetchPronunciationItems(): Promise<PronunciationItem[]> {
  if (cache) return cache;

  // Try storage bucket first
  const { data: urlData } = supabase.storage
    .from("curriculums")
    .getPublicUrl("shared/tongue-twisters.json");

  if (urlData?.publicUrl) {
    try {
      const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        cache = data;
        return data;
      }
    } catch { /* fall through */ }
  }

  // Fallback: local
  const res = await fetch("/data/tongue-twisters.json");
  if (!res.ok) throw new Error("Failed to load pronunciation items");
  const data = await res.json();
  cache = data;
  return data;
}
