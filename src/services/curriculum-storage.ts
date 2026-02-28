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

const cache = new Map<string, CurriculumData>();

/**
 * Fetch and parse curriculum JSON for a given course type.
 * Tries storage bucket first, falls back to /data/ local files.
 */
export async function fetchCurriculumJSON(
  courseType: "ielts" | "igcse"
): Promise<CurriculumData> {
  const fileName = courseType === "ielts" ? "ielts-shadowing.json" : "igcse-shadowing.json";

  if (cache.has(fileName)) return cache.get(fileName)!;

  // Try storage bucket first
  const { data: urlData } = supabase.storage
    .from("curriculum")
    .getPublicUrl(fileName);

  if (urlData?.publicUrl) {
    try {
      const res = await fetch(urlData.publicUrl);
      if (res.ok) {
        const json = await res.json() as CurriculumData;
        cache.set(fileName, json);
        return json;
      }
    } catch {
      // fall through to local
    }
  }

  // Fallback: local public/data/
  const res = await fetch(`/data/${fileName}`);
  if (!res.ok) throw new Error(`Failed to load curriculum: ${fileName}`);
  const json = await res.json() as CurriculumData;
  cache.set(fileName, json);
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
): CurriculumChunk[] {
  const week = data.find((w) => w.week_number === weekNumber);
  if (!week) return [];

  const sectionIds =
    courseType === "ielts"
      ? ["part_2", "part_3"]
      : ["transcoded", "model_answer"];

  const chunks: CurriculumChunk[] = [];
  for (const section of week.sections) {
    if (sectionIds.includes(section.section_id)) {
      for (const q of section.questions) {
        chunks.push(...q.chunks);
      }
    }
  }
  return chunks;
}

/**
 * Get speaking questions for a specific week (question_text only, no model answers).
 */
export function getSpeakingQuestions(
  data: CurriculumData,
  weekNumber: number
): string[] {
  const week = data.find((w) => w.week_number === weekNumber);
  if (!week) return [];

  const questions: string[] = [];
  for (const section of week.sections) {
    for (const q of section.questions) {
      questions.push(q.question_text);
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
