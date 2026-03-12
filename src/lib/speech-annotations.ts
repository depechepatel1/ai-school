/**
 * Speech Annotation Utilities
 * Detects fillers, pauses, and repetitions in speech transcripts.
 * These are IELTS Fluency & Coherence assessment markers.
 */

// ── Filler Detection ──────────────────────────────────────────

const FILLER_PATTERNS = [
  /\bum+\b/gi,
  /\buh+\b/gi,
  /\berm?\b/gi,
  /\byou know\b/gi,
  /\bbasically\b/gi,
  /\bso basically\b/gi,
  /\bI mean\b/gi,
  /\bkind of\b/gi,
  /\bsort of\b/gi,
  /,\s*like\b/gi,
  /\blike,/gi,
  /\bright\b(?=\s*[,?])/gi,
];

export interface TextAnnotation {
  start: number;
  end: number;
  type: "filler" | "pause" | "repetition";
  label?: string;
}

export function detectFillers(text: string): TextAnnotation[] {
  const results: TextAnnotation[] = [];
  for (const pattern of FILLER_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      results.push({ start: match.index, end: match.index + match[0].length, type: "filler" });
    }
  }
  return results;
}

// ── Repetition Detection ─────────────────────────────────────

export function detectRepetitions(text: string): TextAnnotation[] {
  const words = text.toLowerCase().replace(/[.,!?;:]/g, "").split(/\s+/).filter(Boolean);
  const results: TextAnnotation[] = [];
  if (words.length < 4) return results;

  for (let phraseLen = 3; phraseLen >= 2; phraseLen--) {
    for (let i = 0; i <= words.length - phraseLen; i++) {
      const phrase = words.slice(i, i + phraseLen).join(" ");
      const searchStart = i + phraseLen;
      const searchEnd = Math.min(words.length, searchStart + 10);
      for (let j = searchStart; j <= searchEnd - phraseLen; j++) {
        const candidate = words.slice(j, j + phraseLen).join(" ");
        if (candidate === phrase) {
          const lowerText = text.toLowerCase();
          let charPos = 0;
          let wordCount = 0;
          for (let k = 0; k < lowerText.length && wordCount < j; k++) {
            if (lowerText[k] === " " && k > 0 && lowerText[k - 1] !== " ") wordCount++;
            charPos = k + 1;
          }
          let endPos = charPos;
          let wordsLeft = phraseLen;
          for (let k = charPos; k < text.length && wordsLeft > 0; k++) {
            if (text[k] === " " && k > charPos) wordsLeft--;
            if (wordsLeft > 0) endPos = k + 1;
          }
          results.push({ start: charPos, end: endPos, type: "repetition" });
        }
      }
    }
  }
  return results;
}

// ── Pause Marker ──────────────────────────────────────────────

const PAUSE_REGEX = /⟦(\d+\.?\d*)s⟧/g;

export function detectPauses(text: string): TextAnnotation[] {
  const results: TextAnnotation[] = [];
  PAUSE_REGEX.lastIndex = 0;
  let match;
  while ((match = PAUSE_REGEX.exec(text)) !== null) {
    results.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "pause",
      label: match[1] + "s",
    });
  }
  return results;
}

// ── Combined Analysis ─────────────────────────────────────────

export interface SpeechAnalysis {
  annotations: TextAnnotation[];
  fillerCount: number;
  pauseCount: number;
  repetitionCount: number;
}

export function analyzeTranscript(text: string): SpeechAnalysis {
  const fillers = detectFillers(text);
  const pauses = detectPauses(text);
  const repetitions = detectRepetitions(text);

  const all = [...fillers, ...pauses, ...repetitions].sort((a, b) => a.start - b.start);
  const merged: TextAnnotation[] = [];
  for (const ann of all) {
    if (merged.length > 0 && ann.start < merged[merged.length - 1].end) continue;
    merged.push(ann);
  }

  return {
    annotations: merged,
    fillerCount: fillers.length,
    pauseCount: pauses.length,
    repetitionCount: repetitions.length,
  };
}

// ── Pause Marker Preservation (for punctuation round-trips) ──

const PAUSE_MARKER_RE = /\s*⟦\d+\.?\d*s⟧\s*/g;

interface MarkerSlot { marker: string; wordIndexBefore: number }

/** Strip ⟦…s⟧ markers, returning clean text + slots for reinsertion. */
export function stripPauseMarkers(text: string): { clean: string; slots: MarkerSlot[] } {
  const slots: MarkerSlot[] = [];
  let wordCount = 0;
  let last = 0;
  const clean: string[] = [];

  PAUSE_MARKER_RE.lastIndex = 0;
  let m;
  while ((m = PAUSE_MARKER_RE.exec(text)) !== null) {
    const before = text.slice(last, m.index);
    if (before) {
      const words = before.trim().split(/\s+/).filter(Boolean);
      wordCount += words.length;
      clean.push(before);
    }
    slots.push({ marker: m[0].trim(), wordIndexBefore: wordCount });
    last = m.index + m[0].length;
  }
  if (last < text.length) clean.push(text.slice(last));

  return { clean: clean.join("").replace(/\s{2,}/g, " ").trim(), slots };
}

/** Re-inject pause markers into punctuated text at the saved word positions. */
export function reinsertPauseMarkers(punctuated: string, slots: MarkerSlot[]): string {
  if (slots.length === 0) return punctuated;

  const words = punctuated.split(/(\s+)/); // keep whitespace tokens
  const realWordIndices: number[] = [];
  words.forEach((w, i) => { if (w.trim()) realWordIndices.push(i); });

  // Insert markers in reverse order so indices stay valid
  const sorted = [...slots].sort((a, b) => b.wordIndexBefore - a.wordIndexBefore);
  for (const { marker, wordIndexBefore } of sorted) {
    const insertAt = wordIndexBefore < realWordIndices.length
      ? realWordIndices[wordIndexBefore]
      : words.length;
    words.splice(insertAt, 0, ` ${marker} `);
    // Rebuild index map not needed since we go in reverse
  }

  return words.join("").replace(/\s{2,}/g, " ").trim();
}

// ── Pause Injection Helper ───────────────────────────────────

export function createPauseTracker(thresholdMs = 1500) {
  let lastResultTime = 0;

  return {
    onChunk(): string {
      const now = Date.now();
      let marker = "";
      if (lastResultTime > 0) {
        const gap = now - lastResultTime;
        if (gap >= thresholdMs) {
          const seconds = (gap / 1000).toFixed(1);
          marker = ` ⟦${seconds}s⟧ `;
        }
      }
      lastResultTime = now;
      return marker;
    },
    reset() {
      lastResultTime = 0;
    },
  };
}
