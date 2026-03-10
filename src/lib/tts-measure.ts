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
const BATCH_SIZE = 15;
const BATCH_REST_MS = 2000;
const INTER_UTTERANCE_MS = 500;
const KEEPALIVE_INTERVAL_MS = 10000;

export async function measureAllChunkDurations(
  chunks: string[],
  accent: Accent = "uk",
  rate = 0.8,
  onProgress?: (current: number, total: number) => void,
  cancelSignal?: { current: boolean }
): Promise<MeasurementResult> {
  if (!("speechSynthesis" in window)) {
    throw new Error("SpeechSynthesis API not available in this browser");
  }

  // Ensure voices are loaded
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) {
    await new Promise<void>((resolve) => {
      speechSynthesis.addEventListener("voiceschanged", () => resolve(), { once: true });
      setTimeout(resolve, 3000);
    });
  }

  const voice = findVoiceForAccent(accent);
  const timings: Record<string, number> = {};
  const uniqueChunks = [...new Set(chunks)];

  // Keepalive: prevent engine idle timeout by pinging every 10s
  const keepalive = setInterval(() => {
    try {
      speechSynthesis.pause();
      speechSynthesis.resume();
    } catch {
      // ignore
    }
  }, KEEPALIVE_INTERVAL_MS);

  try {
    // Process in batches
    for (let batchStart = 0; batchStart < uniqueChunks.length; batchStart += BATCH_SIZE) {
      if (cancelSignal?.current) {
        speechSynthesis.cancel();
        break;
      }

      const batchEnd = Math.min(batchStart + BATCH_SIZE, uniqueChunks.length);

      for (let i = batchStart; i < batchEnd; i++) {
        if (cancelSignal?.current) {
          speechSynthesis.cancel();
          break;
        }

        const text = uniqueChunks[i];
        onProgress?.(i + 1, uniqueChunks.length);

        // Inter-utterance delay
        if (i > batchStart) {
          await new Promise((r) => setTimeout(r, INTER_UTTERANCE_MS));
        }

        // Cancel any lingering speech
        speechSynthesis.cancel();
        await new Promise((r) => setTimeout(r, 50));

        let duration = await measureSingle(text, voice, rate);

        // Retry once if it timed out (engine likely hung)
        if (duration >= 15000) {
          speechSynthesis.cancel();
          await new Promise((r) => setTimeout(r, 1000));
          duration = await measureSingle(text, voice, rate);
        }

        timings[text] = duration;
      }

      // Batch rest: reset engine and pause before next batch
      if (batchStart + BATCH_SIZE < uniqueChunks.length && !cancelSignal?.current) {
        speechSynthesis.cancel();
        await new Promise((r) => setTimeout(r, BATCH_REST_MS));
      }
    }
  } finally {
    clearInterval(keepalive);
    speechSynthesis.cancel();
  }

  return {
    timings,
    accent,
    rate,
    generatedAt: new Date().toISOString(),
    version: 1,
  };
}
