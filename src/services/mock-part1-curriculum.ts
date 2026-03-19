/**
 * Service to fetch the IELTS Mock Test Part 1 examiner script
 * from the curriculums storage bucket and build a randomised
 * question sequence for a single test session.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────

interface R1Variant {
  variant_id: string;
  topic: string;
  intro: string;
  questions: string[];
}

interface R2Variant {
  variant_id: string;
  topic: string;
  intro: string;
  study_questions: string[];
  work_questions: string[];
}

interface TopicFrame {
  frame_id: number;
  topic: string;
  intro: string;
  questions: string[];
}

export interface Part1Script {
  metadata: Record<string, unknown>;
  test_flow: Record<string, unknown>;
  opening_frames: {
    R1_variants: R1Variant[];
    R2_variants: R2Variant[];
  };
  topic_frames: TopicFrame[];
}

export interface Part1Segment {
  intro?: string;
  questions: string[];
}

export interface Part1Sequence {
  introduction: string[];
  segments: Part1Segment[];
}

// ── Cache ──────────────────────────────────────────────────────

let cachedScript: Part1Script | null = null;
let cachedVersion: number | null = null;

export function clearPart1Cache() {
  cachedScript = null;
  cachedVersion = null;
}

// ── Fetch ──────────────────────────────────────────────────────

export async function fetchPart1Script(): Promise<Part1Script> {
  // Get active metadata row
  const { data: meta } = await supabase
    .from("curriculum_metadata")
    .select("file_path, version")
    .eq("course_type", "ielts")
    .eq("module_type", "mock-part1")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!meta) throw new Error("No active Part 1 script found");

  // Return cache if version matches
  if (cachedScript && cachedVersion === meta.version) return cachedScript;

  const { data: urlData } = supabase.storage
    .from("curriculums")
    .getPublicUrl(meta.file_path);

  const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`);
  if (!res.ok) throw new Error("Failed to fetch Part 1 script");

  const script: Part1Script = await res.json();
  cachedScript = script;
  cachedVersion = meta.version;
  return script;
}

// ── Build sequence ─────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Build a deterministic (per-call) Part 1 question sequence.
 * @param script  The full Part 1 JSON
 * @param placeholders  Values for {examiner_name}, {country}, etc.
 */
/**
 * Strip square-bracket prompts like [Why/Why not?] from a question string.
 * Returns the cleaned question for TTS and the extracted follow-up prompt (if any).
 */
export function stripBracketPrompts(text: string): { clean: string; followUp: string | null } {
  const match = text.match(/\s*\[([^\]]+)\]\s*$/);
  if (!match) return { clean: text, followUp: null };
  return {
    clean: text.slice(0, match.index).trimEnd(),
    followUp: match[1], // e.g. "Why/Why not?"
  };
}

export function buildPart1Sequence(
  script: Part1Script,
  placeholders: Record<string, string> = {}
): Part1Sequence {
  const fill = (text: string) => {
    let out = text;
    for (const [key, val] of Object.entries(placeholders)) {
      out = out.split(`{${key}}`).join(val);
    }
    // Replace any remaining "Good morning/afternoon/evening" with time-appropriate greeting
    if (out.includes("morning/afternoon/evening")) {
      const h = new Date().getHours();
      const greeting = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
      out = out.replace("morning/afternoon/evening", greeting);
    }
    return out;
  };

  // 1. Introduction lines
  const introFlow = (script.test_flow as any).step_1_introduction;
  const introduction: string[] = (introFlow?.script ?? []).map(fill);

  // 2. Opening frame — randomly pick R1 or R2
  const segments: Part1Segment[] = [];
  const useR1 = Math.random() < 0.5;

  if (useR1) {
    const variant = pick(script.opening_frames.R1_variants);
    segments.push({
      intro: fill(variant.intro),
      questions: variant.questions.map(fill),
    });
  } else {
    const variant = pick(script.opening_frames.R2_variants);
    // For students, always use study_questions
    segments.push({
      intro: fill(variant.intro),
      questions: variant.study_questions.map(fill),
    });
  }

  // 3. Two topic frames
  const frames = pickN(script.topic_frames, 2);
  for (const frame of frames) {
    segments.push({
      intro: fill(frame.intro),
      questions: frame.questions.map(fill),
    });
  }

  return { introduction, segments };
}
