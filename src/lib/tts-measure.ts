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
const BATCH_SIZE = 10;
const BATCH_REST_MS = 3000;
const INTER_UTTERANCE_MS = 500;

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

  console.log("[TTS-MEASURE] Starting measurement:", { totalChunks: chunks.length, accent, rate, batchSize: BATCH_SIZE });

  // Ensure voices are loaded
  const voices = speechSynthesis.getVoices();
  console.log("[TTS-MEASURE] Voices available:", voices.length);
  if (voices.length === 0) {
    console.log("[TTS-MEASURE] Waiting for voices to load...");
    await new Promise<void>((resolve) => {
      speechSynthesis.addEventListener("voiceschanged", () => resolve(), { once: true });
      setTimeout(resolve, 3000);
    });
    console.log("[TTS-MEASURE] Voices after wait:", speechSynthesis.getVoices().length);
  }

  const voice = findVoiceForAccent(accent);
  console.log("[TTS-MEASURE] Selected voice:", voice?.name ?? "null", voice?.lang ?? "");
  const timings: Record<string, number> = {};
  const uniqueChunks = [...new Set(chunks)];
  console.log("[TTS-MEASURE] Unique chunks to measure:", uniqueChunks.length);

  try {
    for (let batchStart = 0; batchStart < uniqueChunks.length; batchStart += BATCH_SIZE) {
      if (cancelSignal?.current) {
        speechSynthesis.cancel();
        console.log("[TTS-MEASURE] Cancelled before batch", batchStart / BATCH_SIZE + 1);
        break;
      }

      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(uniqueChunks.length / BATCH_SIZE);
      const batchEnd = Math.min(batchStart + BATCH_SIZE, uniqueChunks.length);
      console.log(`[TTS-MEASURE] === Batch ${batchNum}/${totalBatches} (items ${batchStart + 1}-${batchEnd}) ===`);

      // Warm up the engine before each batch
      speechSynthesis.cancel();
      await new Promise((r) => setTimeout(r, 200));
      console.log("[TTS-MEASURE] Warm-up speak...");
      await measureSingle(".", voice, 1, 3000);
      await new Promise((r) => setTimeout(r, 300));
      console.log("[TTS-MEASURE] Warm-up done, starting items");

      for (let i = batchStart; i < batchEnd; i++) {
        if (cancelSignal?.current) {
          speechSynthesis.cancel();
          console.log("[TTS-MEASURE] Cancelled at item", i);
          break;
        }

        const text = uniqueChunks[i];
        onProgress?.(i + 1, uniqueChunks.length);

        if (i > batchStart) {
          await new Promise((r) => setTimeout(r, INTER_UTTERANCE_MS));
        }

        speechSynthesis.cancel();
        await new Promise((r) => setTimeout(r, 50));

        console.log(`[TTS-MEASURE] Item ${i + 1}/${uniqueChunks.length}: "${text.substring(0, 40)}..."`);
        let duration = await measureSingle(text, voice, rate);

        // Retry once if it timed out
        if (duration >= 15000) {
          console.warn(`[TTS-MEASURE] Timeout on item ${i + 1}, retrying...`);
          speechSynthesis.cancel();
          await new Promise((r) => setTimeout(r, 1000));
          duration = await measureSingle(text, voice, rate);
          console.log(`[TTS-MEASURE] Retry result: ${duration}ms`);
        }

        timings[text] = duration;
        console.log(`[TTS-MEASURE] Item ${i + 1} done: ${duration}ms`);
      }

      // Batch rest
      if (batchStart + BATCH_SIZE < uniqueChunks.length && !cancelSignal?.current) {
        console.log(`[TTS-MEASURE] Batch ${batchNum} done, resting ${BATCH_REST_MS}ms...`);
        speechSynthesis.cancel();
        await new Promise((r) => setTimeout(r, BATCH_REST_MS));
      }
    }
  } finally {
    speechSynthesis.cancel();
    console.log("[TTS-MEASURE] Finished. Total measured:", Object.keys(timings).length);
  }

  return {
    timings,
    accent,
    rate,
    generatedAt: new Date().toISOString(),
    version: 1,
  };
}
