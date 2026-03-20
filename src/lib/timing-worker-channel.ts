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

export interface TimingJobStartedMessage {
  type: "JOB_STARTED";
  jobLabel: string;
  jobIndex: number;
  totalJobs: number;
}

export interface TimingQueueCompleteMessage {
  type: "QUEUE_COMPLETE";
  completedJobs: number;
  totalJobs: number;
}

export type TimingWorkerMessage =
  | TimingProgressMessage
  | TimingCompleteMessage
  | TimingCancelledMessage
  | TimingErrorMessage
  | TimingReadyMessage
  | TimingStartAckMessage
  | TimingJobStartedMessage
  | TimingQueueCompleteMessage;

let workerWindow: Window | null = null;

/**
 * Ensure the popup window is open, returning it.
 */
function ensurePopup(): Window {
  if (workerWindow && !workerWindow.closed) {
    workerWindow.focus();
    return workerWindow;
  }

  const w = window.open(
    `/timing-worker.html?t=${Date.now()}`,
    "tts-timing-worker",
    "width=500,height=600,scrollbars=yes,resizable=yes"
  );

  if (!w) throw new Error("Popup blocked — please allow popups for this site");
  workerWindow = w;
  return w;
}

/**
 * Send a message to the popup with retry+ack handshake.
 */
function sendWithAck(
  msgFactory: (requestId: string) => Record<string, unknown>,
  onTimeout?: () => void
): void {
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

  const send = () => {
    channel.postMessage({ ...msgFactory(requestId), requestId });
  };

  const onMessage = (e: MessageEvent) => {
    if (e.data?.type === "READY") {
      send();
      return;
    }
    if (e.data?.type === "START_ACK" && e.data.requestId === requestId) {
      acknowledged = true;
      cleanup();
    }
  };

  channel.addEventListener("message", onMessage);

  send();
  retryHandle = window.setInterval(() => {
    if (!acknowledged) send();
  }, 600);

  timeoutHandle = window.setTimeout(() => {
    if (acknowledged) return;
    onTimeout?.();
    channel.postMessage({
      type: "ERROR",
      error: "Worker did not acknowledge. Keep popup open and try again.",
    });
    cleanup();
  }, 8000);
}

/**
 * Launch the timing worker popup and send it a single job config.
 */
export function launchTimingWorker(config: TimingWorkerConfig): void {
  ensurePopup();
  sendWithAck((requestId) => ({ type: "START", config, requestId }));
}

/**
 * Launch the timing worker popup and send it a queue of jobs to run sequentially.
 */
export function launchTimingWorkerQueue(configs: TimingWorkerConfig[]): void {
  if (configs.length === 0) return;
  ensurePopup();
  sendWithAck((requestId) => ({ type: "START_QUEUE", configs, requestId }));
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
