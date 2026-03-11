

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
  "You are a professional IELTS Speaking Examiner. Your goal is to assess the student. Keep your responses concise (1-2 sentences). In Part 1, ask about personal topics (hometown, work, studies). In Part 3, ask abstract questions based on the Part 2 topic. Do not be overly encouraging, act formal but polite. Ask one question at a time. Do not repeat questions already asked.";
