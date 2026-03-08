/**
 * Curriculum Storage Service
 * 
 * Fetches and parses curriculum JSON files from the storage bucket.
 * Falls back to local public/data/ files if storage is unavailable.
 */
import { supabase } from "@/integrations/supabase/client";
import { stripHTML, chunkText } from "./csv-to-curriculum";

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

// ── Raw IELTS format normalization ─────────────────────────────

interface RawQuestion {
  html: string;
  spider_diagram_hints?: string[];
  ore_hints?: string[];
}

interface RawWeek {
  week: number;
  theme?: string;
  topic?: string;
  lesson_1_part_2?: Record<string, RawQuestion>;
  lesson_2_part_3?: Record<string, RawQuestion>;
  [key: string]: unknown;
}

/**
 * Detect whether the fetched JSON is in the "raw IELTS" format
 * (has `week` instead of `week_number`, has `lesson_1_part_2` keys).
 */
function isRawIELTSFormat(json: unknown[]): json is RawWeek[] {
  if (!json.length) return false;
  const first = json[0] as Record<string, unknown>;
  return typeof first.week === "number" && !("week_number" in first);
}

/**
 * Parse a raw question html field into question_text + chunked answer.
 * Format: "Question text here.\nAnswer body text here..."
 */
function parseRawQuestionHtml(
  html: string,
  questionId: string
): CurriculumQuestion {
  const cleaned = stripHTML(html);
  
  // Find "You should say" section - everything after it until the model answer starts
  const shouldSayIdx = cleaned.indexOf("You should say");
  
  let questionText: string;
  let answerBody: string;

  if (shouldSayIdx !== -1) {
    // Question is everything before "You should say"
    questionText = cleaned.slice(0, shouldSayIdx).trim();
    
    // Find where the model answer starts - look for patterns like:
    // "And explain..." followed by actual answer content
    // The "You should say" section typically ends with "And explain how/why/what..."
    const afterShouldSay = cleaned.slice(shouldSayIdx);
    
    // Look for "And explain" as the last bullet point, then find content after it
    const andExplainMatch = afterShouldSay.match(/And explain[^.]+\./i);
    if (andExplainMatch) {
      const endOfPrompts = afterShouldSay.indexOf(andExplainMatch[0]) + andExplainMatch[0].length;
      answerBody = afterShouldSay.slice(endOfPrompts).trim();
    } else {
      // Fallback: look for first sentence that doesn't start with common prompt words
      const sentences = afterShouldSay.split(/(?<=[.!?])\s+/);
      const answerStartIdx = sentences.findIndex(s => 
        !s.match(/^(You should say|What|When|Where|Why|Who|How|And explain)/i)
      );
      if (answerStartIdx > 0) {
        answerBody = sentences.slice(answerStartIdx).join(" ").trim();
      } else {
        // No clear answer found - return empty chunks
        answerBody = "";
      }
    }
  } else {
    // No "You should say" - check for newline separation
    const nlIdx = cleaned.indexOf("\n");
    if (nlIdx !== -1) {
      questionText = cleaned.slice(0, nlIdx).trim();
      answerBody = cleaned.slice(nlIdx + 1).trim();
    } else {
      questionText = cleaned;
      answerBody = "";
    }
  }

  // Strip "Q1: " prefix from part 3 questions
  questionText = questionText.replace(/^Q\d+:\s*/, "");
  
  // Remove trailing punctuation then ensure it ends cleanly
  questionText = questionText.replace(/[.?!,]+$/, "").trim();

  const chunks = answerBody ? chunkText(answerBody) : [];

  return {
    question_id: questionId,
    question_text: questionText,
    answer_id: questionId.replace("q", "a"),
    chunks,
  };
}

/**
 * Convert raw IELTS JSON format into normalized CurriculumData.
 */
function normalizeRawCurriculum(raw: RawWeek[]): CurriculumData {
  return raw
    .filter((w) => typeof w.week === "number")
    .map((w) => {
      const sections: CurriculumSection[] = [];

      // lesson_1_part_2 → section "part_2"
      if (w.lesson_1_part_2) {
        const questions: CurriculumQuestion[] = [];
        const keys = Object.keys(w.lesson_1_part_2).sort();
        keys.forEach((key, idx) => {
          const rawQ = w.lesson_1_part_2![key];
          if (rawQ?.html) {
            questions.push(parseRawQuestionHtml(rawQ.html, `q${idx + 1}`));
          }
        });
        if (questions.length) {
          sections.push({ section_id: "part_2", questions });
        }
      }

      // lesson_2_part_3 → section "part_3"
      if (w.lesson_2_part_3) {
        const questions: CurriculumQuestion[] = [];
        const keys = Object.keys(w.lesson_2_part_3).sort();
        keys.forEach((key, idx) => {
          const rawQ = w.lesson_2_part_3![key];
          if (rawQ?.html) {
            questions.push(parseRawQuestionHtml(rawQ.html, `q${idx + 1}`));
          }
        });
        if (questions.length) {
          sections.push({ section_id: "part_3", questions });
        }
      }

      return { week_number: w.week, sections };
    })
    .sort((a, b) => a.week_number - b.week_number);
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
          let json = await res.json();
          // Normalize raw IELTS format if detected
          if (Array.isArray(json) && isRawIELTSFormat(json)) {
            json = normalizeRawCurriculum(json);
          }
          const data = json as CurriculumData;
          cache.set(cacheKey, { data, version: meta.version });
          return data;
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
        let json = await res.json();
        if (Array.isArray(json) && isRawIELTSFormat(json)) {
          json = normalizeRawCurriculum(json);
        }
        const data = json as CurriculumData;
        cache.set(cacheKey, { data, version: meta?.version ?? 0 });
        return data;
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
