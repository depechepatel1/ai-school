/**
 * Curriculum Storage Service
 * 
 * Fetches and parses curriculum JSON files from the storage bucket.
 * Falls back to local public/data/ files if storage is unavailable.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CurriculumChunk {
  chunk_number: number;
  text: string;
}

export interface CurriculumChunkWithQuestion extends CurriculumChunk {
  question_text: string;
  section_id: string;
  question_id: string;
}

export interface CurriculumQuestion {
  question_id: string;
  question_text: string;
  answer_id: string;
  chunks: CurriculumChunk[];
}

export interface CurriculumSection {
  section_id: string;
  questions: CurriculumQuestion[];
}

export interface CurriculumWeek {
  week_number: number;
  sections: CurriculumSection[];
}

export type CurriculumData = CurriculumWeek[];

const cache = new Map<string, { data: CurriculumData; version: number }>();

/** Clear cached curriculum so next fetch pulls fresh data. */
export function clearCurriculumCache() {
  cache.clear();
}

/**
 * Fetch and parse curriculum JSON for a given course type.
 * 1. Query curriculum_metadata for active shadowing-fluency file_path
 * 2. Fetch from 'curriculums' bucket using that path
 * 3. Fall back to legacy 'curriculum' bucket
 * 4. Fall back to local /data/ files
 */
export async function fetchCurriculumJSON(
  courseType: "ielts" | "igcse"
): Promise<CurriculumData> {
  const cacheKey = `${courseType}/shadowing-fluency`;

  // Check metadata for active version
  const { data: metaRows } = await supabase
    .from("curriculum_metadata")
    .select("file_path, version")
    .eq("course_type", courseType)
    .eq("module_type", "shadowing-fluency")
    .eq("is_active", true)
    .limit(1);

  const meta = metaRows?.[0] ?? null;
  const cachedVersion = cache.get(cacheKey)?.version ?? -1;

  // Return cache if version matches
  if (meta && cachedVersion === meta.version) {
    return cache.get(cacheKey)!.data;
  }

  // Try 'curriculums' bucket with metadata path
  if (meta?.file_path) {
    try {
      const { data: urlData } = supabase.storage
        .from("curriculums")
        .getPublicUrl(meta.file_path);
      if (urlData?.publicUrl) {
        const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json() as CurriculumData;
          cache.set(cacheKey, { data: json, version: meta.version });
          return json;
        }
      }
    } catch { /* fall through */ }
  }

  // Fallback: legacy 'curriculum' bucket
  const legacyName = courseType === "ielts" ? "ielts-shadowing.json" : "igcse-shadowing.json";
  try {
    const { data: urlData } = supabase.storage
      .from("curriculum")
      .getPublicUrl(legacyName);
    if (urlData?.publicUrl) {
      const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json() as CurriculumData;
        cache.set(cacheKey, { data: json, version: meta?.version ?? 0 });
        return json;
      }
    }
  } catch { /* fall through */ }

  // Fallback: local public/data/
  const res = await fetch(`/data/${legacyName}`);
  if (!res.ok) throw new Error(`Failed to load curriculum: ${legacyName}`);
  const json = await res.json() as CurriculumData;
  cache.set(cacheKey, { data: json, version: 0 });
  return json;
}

/**
 * Get all chunks for a specific week, combining relevant sections.
 * IELTS: part_2 + part_3 chunks
 * IGCSE: transcoded + model_answer chunks
 */
export function getWeekShadowingChunks(
  data: CurriculumData,
  weekNumber: number,
  courseType: "ielts" | "igcse"
): CurriculumChunkWithQuestion[] {
  const week = data.find((w) => w.week_number === weekNumber);
  if (!week) return [];

  const sectionIds =
    courseType === "ielts"
      ? ["part_2", "part_3"]
      : ["transcoded", "model_answer"];

  const chunks: CurriculumChunkWithQuestion[] = [];
  for (const section of week.sections) {
    if (sectionIds.includes(section.section_id)) {
      // Track question index per section for display (Q1, Q2, …)
      let qIndex = 0;
      for (const q of section.questions) {
        qIndex++;
        for (const chunk of q.chunks) {
          chunks.push({
            ...chunk,
            question_text: q.question_text,
            section_id: section.section_id,
            question_id: `q${qIndex}`,
          });
        }
      }
    }
  }
  return chunks;
}

export interface SpeakingQuestion {
  text: string;
  sectionId: string;
}

/**
 * Get speaking questions for a specific week with section context.
 */
export function getSpeakingQuestions(
  data: CurriculumData,
  weekNumber: number
): SpeakingQuestion[] {
  const week = data.find((w) => w.week_number === weekNumber);
  if (!week) return [];

  const questions: SpeakingQuestion[] = [];
  for (const section of week.sections) {
    for (const q of section.questions) {
      questions.push({ text: q.question_text, sectionId: section.section_id });
    }
  }
  return questions;
}

/**
 * Get the maximum week number in the curriculum data.
 */
export function getMaxWeek(data: CurriculumData): number {
  return data.reduce((max, w) => Math.max(max, w.week_number), 0);
}
