/**
 * TTS Timing Measurement Utility
 * 
 * Measures exact utterance durations using the Web Speech API.
 * Runs near-silently in the admin's browser to pre-record timing data.
 */
import type { Accent } from "./tts-provider";

export interface MeasurementResult {
  timings: Record<string, number>;
  accent: string;
  rate: number;
  generatedAt: string;
  version: number;
}

/**
 * Measure duration of a single text chunk via SpeechSynthesis.
 * Returns duration in milliseconds.
 */
function measureSingle(
  text: string,
  voice: SpeechSynthesisVoice | null,
  rate: number,
  timeoutMs = 15000
): Promise<number> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 0.01; // near-silent

    let startTime = 0;
    const timeout = setTimeout(() => {
      speechSynthesis.cancel();
      resolve(timeoutMs);
    }, timeoutMs);

    utterance.onstart = () => {
      startTime = performance.now();
    };

    utterance.onend = () => {
      clearTimeout(timeout);
      resolve(Math.round(performance.now() - startTime));
    };

    utterance.onerror = () => {
      clearTimeout(timeout);
      resolve(timeoutMs);
    };

    speechSynthesis.speak(utterance);
  });
}

/**
 * Find the best voice for an accent.
 */
function findVoiceForAccent(accent: Accent): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  const langPrefix = accent === "uk" ? "en-GB" : accent === "us" ? "en-US" : "zh-CN";

  // Priority: Natural voices
  const natural = voices.filter(
    (v) => v.name.includes("Natural") && v.lang.startsWith(langPrefix)
  );
  if (natural.length > 0) return natural[0];

  const match = voices.filter((v) => v.lang.startsWith(langPrefix));
  if (match.length > 0) return match[0];

  const anyEn = voices.find((v) => v.lang.startsWith("en"));
  return anyEn || voices[0] || null;
}

/**
 * Measure durations for all provided text chunks sequentially.
 * Returns a MeasurementResult with timing data.
 */
export async function measureAllChunkDurations(
  chunks: string[],
  accent: Accent = "uk",
  rate = 0.8,
  onProgress?: (current: number, total: number) => void
): Promise<MeasurementResult> {
  if (!("speechSynthesis" in window)) {
    throw new Error("SpeechSynthesis API not available in this browser");
  }

  // Ensure voices are loaded
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) {
    await new Promise<void>((resolve) => {
      speechSynthesis.addEventListener("voiceschanged", () => resolve(), { once: true });
      setTimeout(resolve, 3000); // fallback timeout
    });
  }

  const voice = findVoiceForAccent(accent);
  const timings: Record<string, number> = {};
  const uniqueChunks = [...new Set(chunks)]; // deduplicate

  for (let i = 0; i < uniqueChunks.length; i++) {
    const text = uniqueChunks[i];
    onProgress?.(i + 1, uniqueChunks.length);

    // Small delay between utterances to prevent engine congestion
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 200));
    }

    // Cancel any lingering speech
    speechSynthesis.cancel();
    await new Promise((r) => setTimeout(r, 50));

    const duration = await measureSingle(text, voice, rate);
    timings[text] = duration;
  }

  return {
    timings,
    accent,
    rate,
    generatedAt: new Date().toISOString(),
    version: 1,
  };
}
