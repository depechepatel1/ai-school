import type { WordData } from "@/lib/prosody";

// ── Domain Types ──────────────────────────────────────────────

export interface CurriculumItem {
  id: string;
  track: string;
  band_level: number;
  topic: string;
  sentence: string;
  sort_order: number;
}

export type Persona = "Examiner" | "Teacher" | "Friend" | "Subject" | "Counselor";
export type TestPart = "part1" | "part2_prep" | "part2_speak" | "part3";
export type TestStatus = "idle" | "running" | "paused_boundary" | "transition_to_speak" | "finishing" | "completed";

export interface TestState {
  status: TestStatus;
  queue: string[];
  currentPartIndex: number;
  currentPart: TestPart | null;
  timeLeft: number;
  elapsedInCurrent: number;
}

export const INITIAL_TEST_STATE: TestState = {
  status: "idle",
  queue: [],
  currentPartIndex: -1,
  currentPart: null,
  timeLeft: 0,
  elapsedInCurrent: 0,
};

export interface ChatMsg {
  role: "teacher" | "student";
  text: string;
}

// ── Constants ─────────────────────────────────────────────────

export const FALLBACK_SENTENCES = [
  "The quick brown fox jumps over the lazy dog",
  "She sells seashells by the seashore",
];

export const FLUENCY_SENTENCES = [
  "Photography captures moments in time that we can cherish forever.",
  "I believe that environmental protection is crucial for our future generations.",
  "Many people prefer working from home because it saves commuting time.",
  "Technology has revolutionized the way we communicate with each other.",
  "Learning a new language opens up doors to different cultures and perspectives.",
];

export const PART2_TOPIC = {
  title: "Describe a memorable journey you have taken.",
  cues: [
    "Where you went",
    "How you traveled",
    "Who you went with",
    "And explain why this journey was memorable to you",
  ],
} as const;

export const SYSTEM_PROMPT =
  `You are a professional IELTS Speaking Examiner. Your goal is to assess the student across the 4 official IELTS Speaking criteria:
1. Fluency & Coherence — natural flow, logical structure, use of connectors
2. Lexical Resource — vocabulary range, collocations, idiomatic language
3. Grammatical Range & Accuracy — sentence variety, tense control, error frequency
4. Pronunciation — clarity, stress patterns, intonation (detailed scoring coming via speech analysis)

Rules:
- Keep responses concise (1-2 sentences per question).
- In Part 1, ask about personal topics (hometown, work, studies).
- In Part 3, ask abstract questions related to the Part 2 topic.
- Act formal but polite. Ask one question at a time. Do not repeat questions.
- After each student response, give ONE brief improvement tip referencing a specific criterion.
- After Part 3 ends, provide a brief estimated band score (e.g. "Estimated Band: 5.5-6.0") with one tip per criterion.
- Suggest 2-3 advanced vocabulary words the student could have used in their answers.`;
