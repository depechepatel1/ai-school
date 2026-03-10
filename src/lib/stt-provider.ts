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

export interface STTHandle {
  stop: () => void;
}

// ── Browser implementation ─────────────────────────────────────

function browserListen(
  lang: string,
  callbacks: STTCallbacks,
  continuous = true
): STTHandle {
  const SR =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SR) {
    console.warn("[STT] Speech recognition not supported in this browser.");
    callbacks.onError?.("not-supported");
    return { stop: () => {} };
  }

  const recognition = new SR();
  recognition.lang = lang;
  recognition.continuous = continuous;
  recognition.interimResults = true;

  let stopped = false;
  let restartAttempts = 0;
  const MAX_RESTART_ATTEMPTS = 5;

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
      restartAttempts = 0; // Reset on successful result
      callbacks.onResult?.(finalText);
    }
    if (interimText) callbacks.onInterim?.(interimText);
  };

  recognition.onerror = (event: any) => {
    callbacks.onError?.(event.error);
    if (event.error === "not-allowed" || event.error === "not-supported") {
      stopped = true; // Don't try to restart on permission errors
    }
  };

  recognition.onend = () => {
    if (!stopped) {
      restartAttempts++;
      if (restartAttempts > MAX_RESTART_ATTEMPTS) {
        console.warn("[STT] Max restart attempts reached, stopping.");
        callbacks.onEnd?.();
        return;
      }
      // Auto-restart with exponential backoff
      const delay = Math.min(500 * Math.pow(2, restartAttempts - 1), 5000);
      try {
        setTimeout(() => {
          if (!stopped) recognition.start();
        }, delay);
      } catch {}
    } else {
      callbacks.onEnd?.();
    }
  };

  try {
    recognition.start();
  } catch {}

  return {
    stop: () => {
      stopped = true;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {}
      callbacks.onEnd?.();
    },
  };
}

// ── Aliyun DashScope placeholder ───────────────────────────────

function aliyunListen(
  lang: string,
  callbacks: STTCallbacks,
  continuous = true
): STTHandle {
  // TODO: Implement when Aliyun Paraformer API is available.
  // Will stream audio to a backend function via WebSocket.
  console.warn("[STT] Aliyun provider not yet implemented, falling back to browser.");
  return browserListen(lang, callbacks, continuous);
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Start listening using the configured STT provider.
 * Returns a handle with stop().
 */
export function startListening(
  lang: string,
  callbacks: STTCallbacks,
  continuous = true
): STTHandle {
  if (PROVIDERS.stt === "aliyun") return aliyunListen(lang, callbacks, continuous);
  return browserListen(lang, callbacks, continuous);
}

/** Get the current provider name */
export function getSTTProviderName(): string {
  return PROVIDERS.stt === "aliyun" ? "Aliyun Paraformer" : "Browser Speech API";
}
