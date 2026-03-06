/**
 * TTS Provider Abstraction
 *
 * Unified speak() interface that picks the right engine based on provider-config.
 * Currently: browser SpeechSynthesis with Edge Natural voice priority.
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

// ── Browser (Edge Natural) implementation ──────────────────────

let cachedVoices: Record<string, SpeechSynthesisVoice | null> = {};
let voicesReady = false;

function findVoice(accent: Accent): SpeechSynthesisVoice | null {
  const langPrefix = accent === "uk" ? "en-GB" : accent === "us" ? "en-US" : "zh-CN";
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  if (accent === "zh") {
    // Priority 1: Edge Natural female Chinese voices (Xiaoxiao, Xiaoyi)
    const naturalFemale = voices.filter(
      (v) => v.lang.startsWith("zh-CN") && v.name.includes("Natural") &&
        (v.name.includes("Xiaoxiao") || v.name.includes("Xiaoyi") || !v.name.includes("Yun"))
    );
    if (naturalFemale.length > 0) return naturalFemale[0];

    // Priority 2: Any Natural zh-CN voice
    const natural = voices.filter(
      (v) => v.lang.startsWith("zh-CN") && v.name.includes("Natural")
    );
    if (natural.length > 0) return natural[0];

    // Priority 3: Any zh-CN voice
    const any = voices.filter((v) => v.lang.startsWith("zh-CN"));
    if (any.length > 0) return any[0];

    // Priority 4: Any Chinese voice
    const anyChinese = voices.find((v) => v.lang.startsWith("zh"));
    return anyChinese || null;
  }

  // English voices
  // Priority 1: Edge "Natural" voices (highest quality)
  const natural = voices.filter(
    (v) => v.name.includes("Natural") && v.lang.startsWith(langPrefix)
  );
  if (natural.length > 0) return natural[0];

  // Priority 2: Any voice matching the accent
  const match = voices.filter((v) => v.lang.startsWith(langPrefix));
  if (match.length > 0) return match[0];

  // Priority 3: Any English voice
  const anyEn = voices.find((v) => v.lang.startsWith("en"));
  return anyEn || voices[0];
}

function ensureVoices(): void {
  if (voicesReady) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const load = () => {
    cachedVoices = { uk: findVoice("uk"), us: findVoice("us"), zh: findVoice("zh") };
    voicesReady = true;
  };

  speechSynthesis.addEventListener("voiceschanged", load);
  load(); // try immediately
}

// Init on module load
ensureVoices();

function browserSpeak(text: string, accent: Accent, opts: TTSOptions = {}): TTSHandle {
  if (!("speechSynthesis" in window)) {
    return { stop: () => {}, finished: Promise.resolve() };
  }

  // Only cancel if something is actively playing — avoids cold-restart delay
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
  }

  if (!voicesReady) ensureVoices();
  const voice = cachedVoices[accent] || findVoice(accent);

  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.rate = opts.rate ?? 0.9;
  utterance.pitch = opts.pitch ?? 1;
  utterance.volume = 1;

  const finished = new Promise<void>((resolve) => {
    utterance.onend = () => {
      opts.onEnd?.();
      resolve();
    };
    utterance.onerror = () => {
      opts.onEnd?.();
      resolve();
    };
  });

  if (opts.onBoundary) {
    utterance.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === "word") opts.onBoundary!(e.charIndex);
    };
  }

  if (opts.onStart) utterance.onstart = opts.onStart;

  speechSynthesis.speak(utterance);

  return {
    stop: () => speechSynthesis.cancel(),
    finished,
  };
}

// ── Aliyun DashScope placeholder ───────────────────────────────

function aliyunSpeak(_text: string, _accent: Accent, _opts: TTSOptions = {}): TTSHandle {
  // TODO: Implement when Aliyun DashScope API key is available.
  // Will call a backend function that returns audio, then play via HTMLAudioElement.
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
  // Speak a non-empty silent utterance to prime the neural engine
  // (empty strings are often skipped entirely by the speech engine)
  const warmup = new SpeechSynthesisUtterance(".");
  warmup.volume = 0.01; // near-silent but not zero (some engines skip volume=0)
  warmup.rate = 10;
  const voice = cachedVoices["uk"] || cachedVoices["us"];
  if (voice) warmup.voice = voice;
  speechSynthesis.speak(warmup);
}

/** Preload a specific accent voice so it's warm when needed */
export function preloadAccent(accent: Accent): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  ensureVoices();
  const voice = cachedVoices[accent] || findVoice(accent);
  if (!voice) return;
  const warmup = new SpeechSynthesisUtterance(".");
  warmup.voice = voice;
  warmup.volume = 0.01;
  warmup.rate = 10;
  speechSynthesis.speak(warmup);
}

/** Get the name of the active voice for an accent (useful for UI badges) */
export function getActiveVoiceName(accent: Accent): string {
  if (!voicesReady) ensureVoices();
  const voice = cachedVoices[accent] || findVoice(accent);
  return voice?.name || "System Default";
}

/** Get the current provider name */
export function getProviderName(): string {
  return PROVIDERS.tts === "aliyun" ? "Aliyun DashScope" : "Browser (Edge Natural)";
}
