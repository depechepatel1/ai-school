/**
 * Speech Activity Tracker
 *
 * Tracks whether the student is actively speaking based on STT callback frequency.
 * Used to drive the practice timer — timer should only count when speech is detected.
 *
 * Logic:
 * - Every STT onResult or onInterim callback resets a silence timer
 * - If no callback fires for SILENCE_THRESHOLD_MS, we flag "silent"
 * - If silence exceeds AUTO_PAUSE_MS, we trigger an auto-pause callback
 * - When speech resumes, we flag "speaking" again
 */

export interface SpeechActivityCallbacks {
  /** Fired when student goes silent (no STT results for threshold duration) */
  onSilent?: () => void;
  /** Fired when student starts speaking again after silence */
  onSpeaking?: () => void;
  /** Fired when silence exceeds auto-pause duration */
  onAutoPause?: () => void;
}

export interface SpeechActivityTracker {
  /** Call this every time STT fires onResult or onInterim */
  onSpeechDetected: () => void;
  /** Whether the student is currently speaking */
  isSpeaking: () => boolean;
  /** Total seconds of actual speech (silence excluded) */
  getSpeechSeconds: () => number;
  /** Reset everything */
  reset: () => void;
  /** Clean up timers */
  destroy: () => void;
}

const SILENCE_THRESHOLD_MS = 8000;
const AUTO_PAUSE_MS = 120_000;

export function createSpeechActivityTracker(callbacks: SpeechActivityCallbacks = {}): SpeechActivityTracker {
  let speaking = false;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let autoPauseTimer: ReturnType<typeof setTimeout> | null = null;
  let speechSeconds = 0;
  let lastTickTime = 0;
  let tickInterval: ReturnType<typeof setInterval> | null = null;

  function startTicking() {
    if (tickInterval) return;
    lastTickTime = Date.now();
    tickInterval = setInterval(() => {
      if (speaking) {
        const now = Date.now();
        speechSeconds += (now - lastTickTime) / 1000;
        lastTickTime = now;
      }
    }, 1000);
  }

  function stopTicking() {
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
  }

  function clearTimers() {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    if (autoPauseTimer) { clearTimeout(autoPauseTimer); autoPauseTimer = null; }
  }

  function goSilent() {
    if (!speaking) return;
    speaking = false;
    callbacks.onSilent?.();
  }

  function goSpeaking() {
    if (speaking) return;
    speaking = true;
    lastTickTime = Date.now();
    callbacks.onSpeaking?.();
  }

  return {
    onSpeechDetected() {
      clearTimers();

      if (!speaking) goSpeaking();
      startTicking();

      silenceTimer = setTimeout(() => {
        goSilent();
        autoPauseTimer = setTimeout(() => {
          callbacks.onAutoPause?.();
        }, AUTO_PAUSE_MS - SILENCE_THRESHOLD_MS);
      }, SILENCE_THRESHOLD_MS);
    },

    isSpeaking: () => speaking,
    getSpeechSeconds: () => Math.floor(speechSeconds),

    reset() {
      clearTimers();
      stopTicking();
      speaking = false;
      speechSeconds = 0;
      lastTickTime = 0;
    },

    destroy() {
      clearTimers();
      stopTicking();
    },
  };
}
