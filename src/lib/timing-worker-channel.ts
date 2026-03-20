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

export type TimingWorkerMessage =
  | TimingProgressMessage
  | TimingCompleteMessage
  | TimingCancelledMessage
  | TimingErrorMessage
  | TimingReadyMessage;

let workerWindow: Window | null = null;

/**
 * Launch the timing worker popup and send it a job config.
 * If a popup is already open, it reuses it.
 */
export function launchTimingWorker(config: TimingWorkerConfig): void {
  const channel = new BroadcastChannel(CHANNEL_NAME);

  const sendStart = () => {
    channel.postMessage({ type: "START", config });
  };

  // If existing popup is still open, send directly
  if (workerWindow && !workerWindow.closed) {
    sendStart();
    channel.close();
    return;
  }

  // Open new popup
  workerWindow = window.open(
    "/timing-worker.html",
    "tts-timing-worker",
    "width=500,height=600,scrollbars=yes,resizable=yes"
  );

  if (!workerWindow) {
    channel.close();
    throw new Error("Popup blocked — please allow popups for this site");
  }

  // Wait for READY message then send config
  const readyHandler = (e: MessageEvent) => {
    if (e.data?.type === "READY") {
      channel.removeEventListener("message", readyHandler);
      sendStart();
      channel.close();
    }
  };
  channel.addEventListener("message", readyHandler);

  // Fallback: send after 2s in case READY was missed
  setTimeout(() => {
    channel.removeEventListener("message", readyHandler);
    sendStart();
    channel.close();
  }, 2000);
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
