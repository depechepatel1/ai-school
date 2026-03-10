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
 * Normalise a single parsed JSON object/array into PronunciationItem[].
 */
function normaliseOne(raw: unknown): PronunciationItem[] {
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
    text: item.sentence ?? item.text ?? "",
    module: item.module,
    target_sound: item.target_sound,
  }));
}

/**
 * Parse response text that may contain one or more concatenated JSON objects.
 * e.g. `{ "curriculum": [...] }{ "curriculum": [...] }`
 */
function parseAndNormalise(text: string): PronunciationItem[] {
  // First try: standard JSON parse
  try {
    const parsed = JSON.parse(text);
    const items = normaliseOne(parsed);
    if (items.length > 0) return items;
  } catch {
    // May be concatenated JSON objects — split and merge
  }

  // Split on `}{` boundary (handles concatenated JSON blobs)
  const allItems: PronunciationItem[] = [];
  const chunks = text.split(/\}\s*\{/).map((chunk, i, arr) => {
    if (i === 0) return chunk + "}";
    if (i === arr.length - 1) return "{" + chunk;
    return "{" + chunk + "}";
  });

  for (const chunk of chunks) {
    try {
      const parsed = JSON.parse(chunk);
      allItems.push(...normaliseOne(parsed));
    } catch {
      console.warn("[pronunciation] Skipping unparseable chunk");
    }
  }

  // Re-assign sequential IDs to avoid duplicates
  return allItems.map((item, idx) => ({ ...item, id: idx + 1 }));
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
        const text = await res.text();
        const items = parseAndNormalise(text);
        if (items.length > 0) {
          console.log(`[pronunciation] Loaded ${items.length} items from storage`);
          cache = items;
          return items;
        }
      }
    } catch (err) {
      console.error("[pronunciation] Fetch error:", err);
    }
  }

  throw new Error(
    "Failed to load pronunciation items from storage. Please upload a pronunciation curriculum first."
  );
}
