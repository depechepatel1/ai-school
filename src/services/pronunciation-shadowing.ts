/**
 * Fetch pronunciation shadowing items from the curriculums bucket.
 *
 * The bucket file uses the curriculum upload format:
 *   { curriculum: [{ id, module, target_sound, sentence }, …] }
 *
 * This service normalises that into PronunciationItem[].
 */
import { supabase } from "@/integrations/supabase/client";

export interface PronunciationItem {
  id: number;
  text: string;
  module?: number;
  target_sound?: string;
}

let cache: PronunciationItem[] | null = null;

export function clearPronunciationCache(): void {
  cache = null;
}

/**
 * Normalise raw JSON from the bucket into PronunciationItem[].
 * Handles both legacy flat array and the { curriculum: [...] } wrapper.
 */
function normalise(raw: unknown): PronunciationItem[] {
  // Unwrap { curriculum: [...] } wrapper if present
  let arr: unknown[] | null = null;

  if (Array.isArray(raw)) {
    arr = raw;
  } else if (
    raw &&
    typeof raw === "object" &&
    "curriculum" in raw &&
    Array.isArray((raw as Record<string, unknown>).curriculum)
  ) {
    arr = (raw as Record<string, unknown>).curriculum as unknown[];
  }

  if (!arr || arr.length === 0) return [];

  return arr.map((item: any, idx: number) => ({
    id: item.id ?? idx + 1,
    // New format uses "sentence", old format uses "text"
    text: item.sentence ?? item.text ?? "",
    module: item.module,
    target_sound: item.target_sound,
  }));
}

export async function fetchPronunciationItems(): Promise<PronunciationItem[]> {
  if (cache) return cache;

  // Fetch from curriculums bucket
  const { data: urlData } = supabase.storage
    .from("curriculums")
    .getPublicUrl("shared/tongue-twisters.json");

  if (urlData?.publicUrl) {
    try {
      const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`);
      if (res.ok) {
        const raw = await res.json();
        const items = normalise(raw);
        if (items.length > 0) {
          cache = items;
          return items;
        }
      }
    } catch { /* fall through */ }
  }

  throw new Error(
    "Failed to load pronunciation items from storage. Please upload a pronunciation curriculum first."
  );
}
