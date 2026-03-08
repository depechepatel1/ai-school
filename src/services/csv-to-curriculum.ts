/**
 * CSV-to-Curriculum Converter
 *
 * Parses the IGCSE CSV format (one row per week, 28 columns) and converts it
 * into the standard CurriculumData JSON structure used by the app.
 */
import type { CurriculumData, CurriculumWeek, CurriculumSection, CurriculumQuestion, CurriculumChunk } from "./curriculum-storage";

// ── CSV Parsing ────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of objects keyed by header names.
 * Handles quoted fields with commas and newlines inside quotes.
 */
function parseCSV(csv: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && csv[i + 1] === "\n")) {
        current.push(field);
        field = "";
        if (current.length > 1) rows.push(current);
        current = [];
        if (ch === "\r") i++; // skip \n after \r
      } else {
        field += ch;
      }
    }
  }
  // last field / row
  current.push(field);
  if (current.length > 1) rows.push(current);

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] ?? "").trim();
    });
    return obj;
  });
}

// ── HTML Stripping ─────────────────────────────────────────────

/** Strip all HTML tags and decode common entities. */
export function stripHTML(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Auto-Chunking ──────────────────────────────────────────────

const MIN_WORDS = 6;
const MAX_WORDS = 14;
const TARGET_WORDS = 10;

/**
 * Split plain text into chunks of ~8-12 words at natural boundaries.
 * Keeps Chinese annotations in parentheses attached to preceding words.
 */
function chunkText(text: string): CurriculumChunk[] {
  if (!text) return [];

  // First split into sentences (keep delimiter attached)
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);

  const rawFragments: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    if (words.length <= MAX_WORDS) {
      rawFragments.push(sentence.trim());
    } else {
      // Split long sentences at clause boundaries (comma + space)
      const clauses = sentence.split(/,\s+/);
      let buffer = "";
      for (const clause of clauses) {
        const combined = buffer ? `${buffer}, ${clause}` : clause;
        const combinedWords = combined.split(/\s+/).length;
        if (combinedWords > MAX_WORDS && buffer) {
          rawFragments.push(buffer.trim());
          buffer = clause;
        } else {
          buffer = combined;
        }
      }
      if (buffer) rawFragments.push(buffer.trim());
    }
  }

  // Merge fragments that are too short
  const chunks: CurriculumChunk[] = [];
  let pending = "";
  let chunkNum = 1;

  for (const frag of rawFragments) {
    if (!pending) {
      pending = frag;
    } else {
      const mergedWords = `${pending} ${frag}`.split(/\s+/).length;
      if (mergedWords <= MAX_WORDS) {
        pending = `${pending} ${frag}`;
      } else {
        chunks.push({ chunk_number: chunkNum++, text: pending });
        pending = frag;
      }
    }
  }
  if (pending) {
    // If the last chunk is very short, merge with previous
    if (chunks.length > 0 && pending.split(/\s+/).length < MIN_WORDS) {
      const last = chunks[chunks.length - 1];
      const mergedWords = `${last.text} ${pending}`.split(/\s+/).length;
      if (mergedWords <= MAX_WORDS + 2) {
        last.text = `${last.text} ${pending}`;
      } else {
        chunks.push({ chunk_number: chunkNum++, text: pending });
      }
    } else {
      chunks.push({ chunk_number: chunkNum++, text: pending });
    }
  }

  return chunks;
}

// ── Parse warmup questions JSON array ──────────────────────────

function parseWarmupQuestions(raw: string): string[] {
  if (!raw) return [];
  try {
    // The CSV stores warmup_questions as a JSON array of strings
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((q: string) => stripHTML(q));
    }
  } catch {
    // Fallback: just use the raw text as a single question
    return [stripHTML(raw)];
  }
  return [stripHTML(raw)];
}

// ── Parse circuit prompt points ────────────────────────────────

function parseCircuitPoints(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((p: string) => stripHTML(p));
  } catch {
    return [stripHTML(raw)];
  }
  return [stripHTML(raw)];
}

// ── Main Converter ─────────────────────────────────────────────

/**
 * Convert IGCSE CSV text into CurriculumData.
 * Creates two sections per week:
 *   - "transcoded" (from transcoded_input column)
 *   - "model_answer" (from model_answer column)
 */
export function parseCSVToCurriculum(csvText: string): CurriculumData {
  const rows = parseCSV(csvText);
  if (rows.length === 0) throw new Error("CSV file is empty or could not be parsed.");

  const weeks: CurriculumWeek[] = [];

  for (const row of rows) {
    const weekNum = parseInt(row.week_number, 10);
    if (isNaN(weekNum)) continue;

    const sections: CurriculumSection[] = [];

    // ── Transcoded section ──
    const transcodedText = stripHTML(row.transcoded_input ?? "");
    const warmupQuestions = parseWarmupQuestions(row.warmup_questions ?? "");

    if (transcodedText) {
      const transcodedChunks = chunkText(transcodedText);
      const questionText = warmupQuestions.length > 0
        ? warmupQuestions[0]
        : `Week ${weekNum} Transcoded Input`;

      const questions: CurriculumQuestion[] = [{
        question_id: "q1",
        question_text: questionText,
        answer_id: "a1",
        chunks: transcodedChunks,
      }];

      // Add remaining warmup questions as additional entries if they exist
      for (let i = 1; i < warmupQuestions.length; i++) {
        questions.push({
          question_id: `q${i + 1}`,
          question_text: warmupQuestions[i],
          answer_id: `a${i + 1}`,
          chunks: transcodedChunks, // same chunks, different question context
        });
      }

      sections.push({ section_id: "transcoded", questions });
    }

    // ── Model Answer section ──
    const modelText = stripHTML(row.model_answer ?? "");
    const promptIntro = stripHTML(row.circuit_prompt_intro ?? "");
    const promptPoints = parseCircuitPoints(row.circuit_prompt_points ?? "");

    if (modelText) {
      const modelChunks = chunkText(modelText);
      const questionText = promptIntro
        ? `${promptIntro} ${promptPoints.join("; ")}`
        : `Week ${weekNum} Model Answer`;

      sections.push({
        section_id: "model_answer",
        questions: [{
          question_id: "q1",
          question_text: questionText.trim(),
          answer_id: "a1",
          chunks: modelChunks,
        }],
      });
    }

    if (sections.length > 0) {
      weeks.push({ week_number: weekNum, sections });
    }
  }

  // Sort by week number
  weeks.sort((a, b) => a.week_number - b.week_number);

  return weeks;
}
