/**
 * BroadcastChannel wrapper for communicating with the TTS timing popup worker.
 */

const CHANNEL_NAME = "tts-timing-worker";

export interface TimingWorkerConfig {
  chunks: string[];
  accent: string;
  rate: number;
  storagePath: string;
  supabaseUrl: string;
  anonKey: string;
  jobLabel: string;
}

export interface TimingProgressMessage {
  type: "PROGRESS";
  current: number;
  total: number;
  pct: number;
}

export interface TimingCompleteMessage {
  type: "COMPLETE";
  storagePath: string;
  count: number;
}

export interface TimingCancelledMessage {
  type: "CANCELLED";
  measured: number;
  total: number;
}

export interface TimingErrorMessage {
  type: "ERROR";
  error: string;
}

export interface TimingReadyMessage {
  type: "READY";
}

export interface TimingStartAckMessage {
  type: "START_ACK";
  requestId: string;
}

export type TimingWorkerMessage =
  | TimingProgressMessage
  | TimingCompleteMessage
  | TimingCancelledMessage
  | TimingErrorMessage
  | TimingReadyMessage
  | TimingStartAckMessage;

let workerWindow: Window | null = null;

/**
 * Launch the timing worker popup and send it a job config.
 * Uses retry + ack handshake to avoid race conditions.
 */
export function launchTimingWorker(config: TimingWorkerConfig): void {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let acknowledged = false;
  let cleaned = false;
  let retryHandle: number | null = null;
  let timeoutHandle: number | null = null;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (retryHandle !== null) window.clearInterval(retryHandle);
    if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
    channel.removeEventListener("message", onMessage);
    channel.close();
  };

  const sendStart = () => {
    channel.postMessage({ type: "START", config, requestId });
  };

  const onMessage = (e: MessageEvent<TimingWorkerMessage>) => {
    if (e.data?.type === "READY") {
      sendStart();
      return;
    }

    if (e.data?.type === "START_ACK" && e.data.requestId === requestId) {
      acknowledged = true;
      cleanup();
    }
  };

  channel.addEventListener("message", onMessage);

  if (workerWindow && !workerWindow.closed) {
    workerWindow.focus();
  } else {
    workerWindow = window.open(
      `/timing-worker.html?t=${Date.now()}`,
      "tts-timing-worker",
      "width=500,height=600,scrollbars=yes,resizable=yes"
    );
  }

  if (!workerWindow) {
    cleanup();
    throw new Error("Popup blocked — please allow popups for this site");
  }

  sendStart();
  retryHandle = window.setInterval(() => {
    if (!acknowledged) sendStart();
  }, 600);

  timeoutHandle = window.setTimeout(() => {
    if (acknowledged) return;
    channel.postMessage({
      type: "ERROR",
      error: "Worker did not acknowledge START. Keep popup open and try again.",
    });
    cleanup();
  }, 8000);
}

/**
 * Cancel the running timing worker.
 */
export function cancelTimingWorker(): void {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ type: "CANCEL" });
  channel.close();
}

/**
 * Subscribe to timing worker messages.
 * Returns a cleanup function.
 */
export function onTimingWorkerMessage(
  callback: (msg: TimingWorkerMessage) => void
): () => void {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  const handler = (e: MessageEvent) => {
    const data = e.data as TimingWorkerMessage;
    if (data?.type) callback(data);
  };
  channel.addEventListener("message", handler);
  return () => {
    channel.removeEventListener("message", handler);
    channel.close();
  };
}
