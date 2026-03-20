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
  let retryCount = 0;
  const MAX_RETRIES = 3;

  recognition.onresult = (event: any) => {
    retryCount = 0; // reset on successful recognition
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalText += event.results[i][0].transcript;
      } else {
        interimText += event.results[i][0].transcript;
      }
    }
    if (finalText) callbacks.onResult?.(finalText);
    if (interimText) callbacks.onInterim?.(interimText);
  };

  recognition.onerror = (event: any) => {
    callbacks.onError?.(event.error);
  };

  recognition.onend = () => {
    if (!stopped) {
      if (retryCount >= MAX_RETRIES) {
        console.warn("[STT] Max restart retries reached, stopping.");
        callbacks.onError?.("max-retries");
        callbacks.onEnd?.();
        return;
      }
      retryCount++;
      setTimeout(() => {
        if (!stopped) {
          try { recognition.start(); } catch {
            console.warn("[STT] Failed to restart recognition.");
            callbacks.onError?.("restart-failed");
            callbacks.onEnd?.();
          }
        }
      }, 500);
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
