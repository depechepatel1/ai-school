/**
 * Shared constants and helpers for AdminCurriculumUpload.
 * Extracted to reduce file size of the main component.
 */

export interface MetadataRow {
  id: string;
  course_type: string;
  module_type: string;
  file_path: string;
  version: number;
  is_active: boolean;
  uploaded_at: string;
}

export const COURSE_OPTIONS = [
  { value: "ielts", label: "IELTS" },
  { value: "igcse", label: "IGCSE" },
];

export const MODULE_OPTIONS = [
  { value: "shadowing-fluency", label: "Shadowing Fluency", path: "shadowing-fluency.json" },
  { value: "shadowing-pronunciation", label: "Shadowing Pronunciation", path: "tongue-twisters.json" },
  { value: "speaking", label: "Speaking Questions", path: "speaking-questions.json" },
];

export const TIMING_PATHS = [
  "ielts/timings-shadowing-fluency.json",
  "igcse/timings-shadowing-fluency.json",
  "shared/timings-shadowing-pronunciation.json",
];

/**
 * Parse potentially malformed text (concatenated JSON objects, or plain JSON)
 * into a single valid JSON string ready for storage upload.
 */
export function normaliseCurriculumText(raw: string, moduleType: string): string {
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // Not valid JSON — try to salvage concatenated objects
  }

  const chunks = trimmed.split(/\}\s*\{/).map((chunk, i, arr) => {
    if (arr.length === 1) return chunk;
    if (i === 0) return chunk + "}";
    if (i === arr.length - 1) return "{" + chunk;
    return "{" + chunk + "}";
  });

  const allItems: unknown[] = [];
  for (const chunk of chunks) {
    try {
      const parsed = JSON.parse(chunk);
      if (Array.isArray(parsed)) {
        allItems.push(...parsed);
      } else if (parsed?.curriculum && Array.isArray(parsed.curriculum)) {
        allItems.push(...parsed.curriculum);
      } else {
        allItems.push(parsed);
      }
    } catch {
      throw new Error("File contains invalid JSON that could not be parsed. Please check the file format.");
    }
  }

  if (allItems.length === 0) {
    throw new Error("No curriculum items found in the uploaded file.");
  }

  const withIds = allItems.map((item: any, idx) => ({ ...item, id: idx + 1 }));

  if (moduleType === "shadowing-pronunciation") {
    return JSON.stringify({ curriculum: withIds }, null, 2);
  }

  return JSON.stringify(withIds, null, 2);
}

export function getFilePath(course: string, module: string) {
  if (module === "shadowing-pronunciation") return "shared/tongue-twisters.json";
  const moduleInfo = MODULE_OPTIONS.find((m) => m.value === module);
  return `${course}/${moduleInfo?.path ?? `${module}.json`}`;
}

export function getTimingPath(filePath: string): string | null {
  const map: Record<string, string> = {
    "ielts/shadowing-fluency.json": "ielts/timings-shadowing-fluency.json",
    "igcse/shadowing-fluency.json": "igcse/timings-shadowing-fluency.json",
    "shared/tongue-twisters.json": "shared/timings-shadowing-pronunciation.json",
  };
  return map[filePath] ?? null;
}

export const FORMATTING_GUIDE = `=== AI CURRICULUM FORMATTING GUIDE ===

Paste this entire prompt into an AI chat tool (ChatGPT, Claude, etc.) along with your raw curriculum content. The AI will reformat it into the JSON format our app needs.

--- START OF PROMPT ---

I need you to convert my curriculum content into a specific JSON format for a language learning app. Please follow these rules precisely:

FORMAT RULES:

1. The output must be valid JSON.

2. The top-level structure is:

{
  "course": "IELTS" or "IGCSE",
  "module": "shadowing-fluency" or "shadowing-pronunciation" or "speaking",
  "weeks": [
    {
      "week_number": 1,
      "content": [ ...see below for content structure per module type... ]
    }
  ]
}

FOR SHADOWING-FLUENCY MODULES:

Each week's "content" is an array of model answers. Each model answer is an array of chunks:

{
  "week_number": 1,
  "content": [
    {
      "question_type": "Part 2",
      "question_number": "Q1",
      "question_text": "Describe a time when you helped someone.",
      "chunks": [
        "I'd like to talk about a time",
        "when I helped my neighbor",
        "move to a new apartment.",
        "It was last summer,",
        "and she was an elderly woman",
        "who lived alone."
      ]
    }
  ]
}

CHUNKING RULES FOR SHADOWING:

- Each chunk should be approximately 8-12 words.
- Break at natural pauses: commas, clause boundaries, or phrase endings.
- Each chunk should be a complete, meaningful phrase that a student can repeat from memory.
- Do NOT break in the middle of a noun phrase or verb phrase.
- Example: "I'd like to talk about a time" (good) vs "I'd like to talk" (too short, incomplete thought)

FOR SPEAKING MODULES:

Each week's "content" is an array of questions:

{
  "week_number": 1,
  "content": [
    {
      "question_type": "Part 2",
      "question_number": "Q1",
      "question_text": "Describe a time when you received good news. You should say: what the news was, when you received it, how you felt about it, and explain why it was good news.",
      "time_limit_minutes": 2
    }
  ]
}

FOR SHADOWING-PRONUNCIATION (TONGUE TWISTERS):

Simple flat array of items to cycle through:

{
  "course": "shared",
  "module": "shadowing-pronunciation",
  "items": [
    {
      "id": 1,
      "text": "She sells seashells by the seashore.",
      "difficulty": "easy"
    }
  ]
}

Now, please convert the following curriculum content into the correct JSON format. If the content is for shadowing, chunk it according to the rules above:

[PASTE YOUR CURRICULUM CONTENT HERE]

--- END OF PROMPT ---
`;
