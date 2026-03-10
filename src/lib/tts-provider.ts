/**
 * TTS Provider Abstraction
 *
 * Unified speak() interface that picks the right engine based on provider-config.
 * Currently: browser SpeechSynthesis with automatic fallback from cloud to local voices.
 * Future:    Aliyun DashScope TTS via edge function.
 */
import { PROVIDERS } from "./provider-config";

// ── Types ──────────────────────────────────────────────────────

export type Accent = "uk" | "us" | "zh";

export interface TTSHandle {
  /** Stop playback */
  stop: () => void;
  /** Promise that resolves when speech ends */
  finished: Promise<void>;
}

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  onBoundary?: (charIndex: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

// ── Voice selection ───────────────────────────────────────────

/** Track which voices have failed with synthesis-failed so we don't retry them */
const failedVoiceNames = new Set<string>();

let cachedVoices: Record<string, SpeechSynthesisVoice[]> = {};
let voicesReady = false;

/**
 * Find all candidate voices for an accent, ordered by priority.
 * Excludes voices known to have failed.
 */
function findVoices(accent: Accent): SpeechSynthesisVoice[] {
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return [];

  const candidates: SpeechSynthesisVoice[] = [];

  if (accent === "zh") {
    // Chinese voice priority
    const zhVoices = voices.filter((v) => v.lang.startsWith("zh"));
    // Natural local > Natural online > any zh-CN > any zh
    const naturalLocal = zhVoices.filter((v) => v.name.includes("Natural") && !v.name.includes("Online"));
    const naturalOnline = zhVoices.filter((v) => v.name.includes("Natural") && v.name.includes("Online"));
    const other = zhVoices.filter((v) => !v.name.includes("Natural"));
    candidates.push(...naturalLocal, ...naturalOnline, ...other);
  } else {
    const langPrefix = accent === "uk" ? "en-GB" : "en-US";

    // Priority tiers for English:
    // 1. Local Natural voices (offline, high quality)
    // 2. Online Natural voices (cloud, may fail in iframes)
    // 3. Any voice matching the accent
    // 4. Any English voice
    const accentVoices = voices.filter((v) => v.lang.startsWith(langPrefix));
    const naturalLocal = accentVoices.filter((v) => v.name.includes("Natural") && !v.name.includes("Online"));
    const naturalOnline = accentVoices.filter((v) => v.name.includes("Natural") && v.name.includes("Online"));
    const otherAccent = accentVoices.filter((v) => !v.name.includes("Natural"));

    // Fallback: any English voice not matching primary accent
    const otherEn = voices.filter((v) => v.lang.startsWith("en") && !v.lang.startsWith(langPrefix));

    candidates.push(...naturalLocal, ...naturalOnline, ...otherAccent, ...otherEn);
  }

  // Filter out voices that have previously failed
  const viable = candidates.filter((v) => !failedVoiceNames.has(v.name));
  // If all are failed, try them all again (reset)
  return viable.length > 0 ? viable : candidates;
}

function getBestVoice(accent: Accent): SpeechSynthesisVoice | null {
  const list = cachedVoices[accent] ?? findVoices(accent);
  return list.length > 0 ? list[0] : null;
}

function ensureVoices(): void {
  if (voicesReady) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const load = () => {
    cachedVoices = { uk: findVoices("uk"), us: findVoices("us"), zh: findVoices("zh") };
    voicesReady = true;
    console.log("[TTS] Voices loaded:", {
      uk: cachedVoices.uk?.map((v) => v.name).slice(0, 3),
      us: cachedVoices.us?.map((v) => v.name).slice(0, 3),
    });
  };

  speechSynthesis.addEventListener("voiceschanged", load);
  load(); // try immediately
}

/** Refresh cached voices after a failure (re-sort with failed voices deprioritized) */
function refreshVoiceCache(): void {
  cachedVoices = { uk: findVoices("uk"), us: findVoices("us"), zh: findVoices("zh") };
}

// Init on module load
ensureVoices();

// ── Browser speak with auto-retry ─────────────────────────────

function createUtterance(
  text: string,
  voice: SpeechSynthesisVoice | null,
  opts: TTSOptions
): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.rate = opts.rate ?? 0.9;
  utterance.pitch = opts.pitch ?? 1;
  utterance.volume = 1;
  return utterance;
}

function browserSpeak(text: string, accent: Accent, opts: TTSOptions = {}): TTSHandle {
  if (!("speechSynthesis" in window)) {
    console.warn("[TTS] speechSynthesis not available");
    return { stop: () => {}, finished: Promise.resolve() };
  }

  if (!text || text.trim().length === 0) {
    console.warn("[TTS] Empty text, skipping");
    return { stop: () => {}, finished: Promise.resolve() };
  }

  let cancelled = false;

  const finished = new Promise<void>((resolve) => {
    const attemptSpeak = (voiceIndex: number) => {
      if (cancelled) { resolve(); return; }

      // Cancel any previous speech
      speechSynthesis.cancel();

      if (!voicesReady) ensureVoices();
      const voiceList = cachedVoices[accent] ?? findVoices(accent);
      const voice = voiceIndex < voiceList.length ? voiceList[voiceIndex] : null;

      if (!voice && voiceIndex > 0) {
        // Exhausted all voices
        console.error("[TTS] All voices failed for accent:", accent);
        opts.onEnd?.();
        resolve();
        return;
      }

      const utterance = createUtterance(text, voice, opts);

      utterance.onend = () => {
        opts.onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        const errorType = (e as any).error || "unknown";
        const voiceName = voice?.name ?? "default";
        console.warn(`[TTS] Voice "${voiceName}" failed with: ${errorType}`);

        if (errorType === "synthesis-failed" || errorType === "network") {
          // Mark this voice as failed and try next one
          if (voice) {
            failedVoiceNames.add(voice.name);
            refreshVoiceCache();
          }

          const nextIndex = voiceIndex + 1;
          const remaining = (cachedVoices[accent] ?? []).length;
          if (nextIndex < remaining + voiceIndex + 1) {
            console.log(`[TTS] Retrying with next voice (attempt ${nextIndex + 1})...`);
            // Small delay before retry to let engine reset
            setTimeout(() => attemptSpeak(0), 100);
          } else {
            console.error("[TTS] No more voices to try");
            opts.onEnd?.();
            resolve();
          }
        } else {
          // Non-retryable error (e.g. "canceled")
          opts.onEnd?.();
          resolve();
        }
      };

      if (opts.onBoundary) {
        utterance.onboundary = (e: SpeechSynthesisEvent) => {
          if (e.name === "word") opts.onBoundary!(e.charIndex);
        };
      }

      if (opts.onStart) utterance.onstart = opts.onStart;

      // Defer speak slightly after cancel to avoid Chrome/Edge swallowing bug
      setTimeout(() => {
        if (cancelled) { resolve(); return; }
        console.log("[TTS] Speaking:", text.substring(0, 50), "| voice:", voice?.name ?? "default");
        speechSynthesis.speak(utterance);
      }, 60);
    };

    attemptSpeak(0);
  });

  return {
    stop: () => {
      cancelled = true;
      speechSynthesis.cancel();
    },
    finished,
  };
}

// ── Aliyun DashScope placeholder ───────────────────────────────

function aliyunSpeak(_text: string, _accent: Accent, _opts: TTSOptions = {}): TTSHandle {
  console.warn("[TTS] Aliyun provider not yet implemented, falling back to browser.");
  return browserSpeak(_text, _accent, _opts);
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Speak text using the configured TTS provider.
 * Returns a handle with stop() and a finished promise.
 */
export function speak(text: string, accent: Accent, opts: TTSOptions = {}): TTSHandle {
  if (PROVIDERS.tts === "aliyun") return aliyunSpeak(text, accent, opts);
  return browserSpeak(text, accent, opts);
}

/** Stop any current speech */
export function stopSpeaking(): void {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

/** Preload/warm up voices so the first real utterance plays instantly */
export function preloadVoices(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  ensureVoices();
  // Use a local voice for warmup to avoid cloud voice failures
  const voice = getBestVoice("uk") ?? getBestVoice("us");
  if (!voice) return;
  const warmup = new SpeechSynthesisUtterance(".");
  warmup.volume = 0.01;
  warmup.rate = 10;
  warmup.voice = voice;
  warmup.onerror = (e) => {
    const name = voice.name;
    console.warn(`[TTS] Warmup failed for "${name}":`, (e as any).error);
    if ((e as any).error === "synthesis-failed") {
      failedVoiceNames.add(name);
      refreshVoiceCache();
    }
  };
  speechSynthesis.speak(warmup);
}

/** Preload a specific accent voice so it's warm when needed */
export function preloadAccent(accent: Accent): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  ensureVoices();
  const voice = getBestVoice(accent);
  if (!voice) return;
  const warmup = new SpeechSynthesisUtterance(".");
  warmup.voice = voice;
  warmup.volume = 0.01;
  warmup.rate = 10;
  warmup.onerror = (e) => {
    console.warn(`[TTS] Accent warmup failed for "${voice.name}":`, (e as any).error);
    if ((e as any).error === "synthesis-failed") {
      failedVoiceNames.add(voice.name);
      refreshVoiceCache();
    }
  };
  speechSynthesis.speak(warmup);
}

/** Get the name of the active voice for an accent (useful for UI badges) */
export function getActiveVoiceName(accent: Accent): string {
  if (!voicesReady) ensureVoices();
  const voice = getBestVoice(accent);
  return voice?.name || "System Default";
}

/** Get the current provider name */
export function getProviderName(): string {
  return PROVIDERS.tts === "aliyun" ? "Aliyun DashScope" : "Browser (Edge Natural)";
}
