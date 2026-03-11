/**
 * STT Provider Abstraction
 *
 * Unified speech recognition interface.
 * Currently: browser Web Speech API.
 * Future:    Aliyun DashScope Paraformer via edge function.
 */
import { PROVIDERS } from "./provider-config";

// ── Types ──────────────────────────────────────────────────────

export interface STTCallbacks {
  onResult?: (transcript: string) => void;
  onInterim?: (interim: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface STTConfig {
  /** Milliseconds of no onResult before onInactivity fires. Default 10000. */
  inactivityMs?: number;
  /** Called when no speech result received for inactivityMs. */
  onInactivity?: () => void;
}

export interface STTHandle {
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

// ── Browser implementation ─────────────────────────────────────

function browserListen(
  lang: string,
  callbacks: STTCallbacks,
  continuous = true,
  config?: STTConfig
): STTHandle {
  const SR =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SR) {
    console.warn("[STT] Speech recognition not supported in this browser.");
    callbacks.onError?.("not-supported");
    return { stop: () => {}, pause: () => {}, resume: () => {} };
  }

  const recognition = new SR();
  recognition.lang = lang;
  recognition.continuous = continuous;
  recognition.interimResults = true;

  let stopped = false;
  let paused = false;
  let restartAttempts = 0;
  const MAX_RESTART_ATTEMPTS = 5;

  // ── Inactivity timer ──
  const inactivityMs = config?.inactivityMs ?? 10000;
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (!config?.onInactivity || stopped || paused) return;
    inactivityTimer = setTimeout(() => {
      if (!stopped && !paused) {
        config.onInactivity?.();
      }
    }, inactivityMs);
  }

  function clearInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }

  recognition.onresult = (event: any) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalText += event.results[i][0].transcript;
      } else {
        interimText += event.results[i][0].transcript;
      }
    }
    if (finalText) {
      restartAttempts = 0;
      callbacks.onResult?.(finalText);
      resetInactivityTimer();
    }
    if (interimText) {
      callbacks.onInterim?.(interimText);
      // Interim results also indicate speech activity — reset timer
      resetInactivityTimer();
    }
  };

  recognition.onerror = (event: any) => {
    callbacks.onError?.(event.error);
    if (event.error === "not-allowed" || event.error === "not-supported") {
      stopped = true;
    }
  };

  recognition.onend = () => {
    if (paused || stopped) {
      if (stopped) callbacks.onEnd?.();
      return;
    }
    // Auto-restart for continuous mode
    restartAttempts++;
    if (restartAttempts > MAX_RESTART_ATTEMPTS) {
      console.warn("[STT] Max restart attempts reached, stopping.");
      callbacks.onEnd?.();
      return;
    }
    const delay = Math.min(500 * Math.pow(2, restartAttempts - 1), 5000);
    try {
      setTimeout(() => {
        if (!stopped && !paused) recognition.start();
      }, delay);
    } catch {}
  };

  try {
    recognition.start();
    resetInactivityTimer();
  } catch {}

  return {
    stop: () => {
      stopped = true;
      paused = false;
      clearInactivityTimer();
      recognition.onend = null;
      try { recognition.stop(); } catch {}
      callbacks.onEnd?.();
    },
    pause: () => {
      if (paused || stopped) return;
      paused = true;
      clearInactivityTimer();
      try { recognition.stop(); } catch {}
    },
    resume: () => {
      if (!paused || stopped) return;
      paused = false;
      restartAttempts = 0;
      try { recognition.start(); } catch {}
      resetInactivityTimer();
    },
  };
}

// ── Aliyun DashScope placeholder ───────────────────────────────

function aliyunListen(
  lang: string,
  callbacks: STTCallbacks,
  continuous = true,
  config?: STTConfig
): STTHandle {
  console.warn("[STT] Aliyun provider not yet implemented, falling back to browser.");
  return browserListen(lang, callbacks, continuous, config);
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Start listening using the configured STT provider.
 * Returns a handle with stop(), pause(), resume().
 */
export function startListening(
  lang: string,
  callbacks: STTCallbacks,
  continuous = true,
  config?: STTConfig
): STTHandle {
  if (PROVIDERS.stt === "aliyun") return aliyunListen(lang, callbacks, continuous, config);
  return browserListen(lang, callbacks, continuous, config);
}

/** Get the current provider name */
export function getSTTProviderName(): string {
  return PROVIDERS.stt === "aliyun" ? "Aliyun Paraformer" : "Browser Speech API";
}
