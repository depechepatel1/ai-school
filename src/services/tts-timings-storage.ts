/**
 * TTS Timings Storage Service
 * 
 * Upload/fetch pre-measured TTS timing data from the curriculums bucket.
 */
import { supabase } from "@/integrations/supabase/client";
import { measureAllChunkDurations, type MeasurementResult } from "@/lib/tts-measure";
import { fetchCurriculumJSON, getWeekShadowingChunks, type CurriculumData } from "./curriculum-storage";
import { fetchTongueTwisters } from "./tongue-twisters";
import type { Accent } from "@/lib/tts-provider";

// In-memory cache
const timingsCache = new Map<string, Record<string, number>>();

// ── Storage paths ──────────────────────────────────────────────

function getFluencyTimingsPath(courseType: string): string {
  return `${courseType}/timings-shadowing-fluency.json`;
}

const PRONUNCIATION_TIMINGS_PATH = "shared/timings-shadowing-pronunciation.json";

// ── Upload ─────────────────────────────────────────────────────

async function uploadTimings(path: string, result: MeasurementResult): Promise<void> {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  const { error } = await supabase.storage
    .from("curriculums")
    .upload(path, blob, { upsert: true });
  if (error) throw error;
}

// ── Fetch ──────────────────────────────────────────────────────

async function fetchTimingsFile(path: string): Promise<Record<string, number> | null> {
  // Check cache
  if (timingsCache.has(path)) return timingsCache.get(path)!;

  const { data: urlData } = supabase.storage
    .from("curriculums")
    .getPublicUrl(path);

  if (!urlData?.publicUrl) return null;

  try {
    const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`);
    if (!res.ok) return null;
    const json: MeasurementResult = await res.json();
    timingsCache.set(path, json.timings);
    return json.timings;
  } catch {
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Fetch fluency timings for a course type.
 */
export async function fetchFluencyTimings(
  courseType: "ielts" | "igcse"
): Promise<Record<string, number> | null> {
  return fetchTimingsFile(getFluencyTimingsPath(courseType));
}

/**
 * Fetch pronunciation (tongue twister) timings.
 */
export async function fetchPronunciationTimings(): Promise<Record<string, number> | null> {
  return fetchTimingsFile(PRONUNCIATION_TIMINGS_PATH);
}

/**
 * Clear timings cache (e.g. after re-measurement).
 */
export function clearTimingsCache(): void {
  timingsCache.clear();
}

/**
 * Extract all unique chunks from a fluency curriculum.
 */
function extractFluencyChunks(data: CurriculumData): string[] {
  const chunks: string[] = [];
  for (const week of data) {
    for (const section of week.sections) {
      for (const question of section.questions) {
        for (const chunk of question.chunks) {
          chunks.push(chunk.text);
        }
      }
    }
  }
  return [...new Set(chunks)];
}

/**
 * Measure and upload fluency timings for a course type.
 */
export async function generateAndUploadFluencyTimings(
  courseType: "ielts" | "igcse",
  accent: Accent = "uk",
  onProgress?: (current: number, total: number) => void,
  cancelSignal?: { current: boolean }
): Promise<MeasurementResult> {
  const data = await fetchCurriculumJSON(courseType);
  const chunks = extractFluencyChunks(data);

  if (chunks.length === 0) {
    throw new Error(`No chunks found for ${courseType} fluency curriculum`);
  }

  const result = await measureAllChunkDurations(chunks, accent, 0.8, onProgress, cancelSignal);
  if (!cancelSignal?.current) {
    await uploadTimings(getFluencyTimingsPath(courseType), result);
    timingsCache.set(getFluencyTimingsPath(courseType), result.timings);
  }

  return result;
}

/**
 * Measure and upload pronunciation (tongue twister) timings.
 */
export async function generateAndUploadPronunciationTimings(
  accent: Accent = "uk",
  onProgress?: (current: number, total: number) => void,
  cancelSignal?: { current: boolean }
): Promise<MeasurementResult> {
  const twisters = await fetchTongueTwisters();
  const texts = twisters.map((t) => t.text);

  if (texts.length === 0) {
    throw new Error("No tongue twisters found");
  }

  const result = await measureAllChunkDurations(texts, accent, 0.8, onProgress, cancelSignal);
  if (!cancelSignal?.current) {
    await uploadTimings(PRONUNCIATION_TIMINGS_PATH, result);
    timingsCache.set(PRONUNCIATION_TIMINGS_PATH, result.timings);
  }

  return result;
}

/**
 * Measure and upload timings for a curriculum data object (used after upload).
 */
export async function generateAndUploadFluencyTimingsFromData(
  data: CurriculumData,
  courseType: "ielts" | "igcse",
  accent: Accent = "uk",
  onProgress?: (current: number, total: number) => void
): Promise<MeasurementResult> {
  const chunks = extractFluencyChunks(data);

  if (chunks.length === 0) {
    throw new Error(`No chunks found in uploaded curriculum`);
  }

  const result = await measureAllChunkDurations(chunks, accent, 0.8, onProgress);
  await uploadTimings(getFluencyTimingsPath(courseType), result);

  timingsCache.set(getFluencyTimingsPath(courseType), result.timings);

  return result;
}
