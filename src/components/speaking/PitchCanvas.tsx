import { useRef, useEffect, useCallback } from "react";
import type { WordData } from "@/lib/prosody";
import { RealtimePitchTracker } from "@/lib/pitch-detector";

interface Props {
  isRecording: boolean;
  isPlayingModel: boolean;
  activeWordIndex: number;
  prosodyData: WordData[];
  modelContour: number[];
  useSyntheticFallback: boolean;
  onAutoStop?: () => void;
  onPitchContour?: (contour: number[]) => void;
}

/* ── Shared history point type ── */
interface HistoryPoint {
  x: number;
  y: number;
  mismatch: boolean;
}

/* ── Shared draw routine (cloned from original LiveInputVisualizer) ── */
function drawHistory(
  ctx: CanvasRenderingContext2D,
  history: HistoryPoint[],
  w: number,
  h: number,
  colorNormal: string,
  colorMismatch: string,
  glowColor: string,
) {
  if (history.length === 0) return;

  // Lead-in from midline to first point
  if (history[0].x > 0) {
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(history[0].x, history[0].y);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Segment-by-segment quadratic render (identical to original)
  for (let i = 1; i < history.length; i++) {
    const p0 = history[i - 1];
    const p1 = history[i];
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
    ctx.lineTo(p1.x, p1.y);
    ctx.strokeStyle = p1.mismatch ? colorMismatch : colorNormal;
    ctx.shadowColor = p1.mismatch ? colorMismatch : glowColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.shadowBlur = 8;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

export default function PitchCanvas({
  isRecording,
  isPlayingModel,
  activeWordIndex,
  prosodyData,
  modelContour,
  useSyntheticFallback,
  onAutoStop,
  onPitchContour,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Mic refs ──
  const micRef = useRef<{
    ctx: AudioContext;
    analyser: AnalyserNode;
    stream: MediaStream;
    tracker: RealtimePitchTracker;
    req: number | null;
  } | null>(null);

  // ── Shared history refs (cloned structure) ──
  const liveHistory = useRef<HistoryPoint[]>([]);
  const liveStartRef = useRef(0);
  const targetHistory = useRef<HistoryPoint[]>([]);
  const targetStartRef = useRef(0);

  // Silence detection
  const silenceStartRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const autoStopTriggeredRef = useRef(false);

  // Flags
  const showLive = useRef(false);
  const showTarget = useRef(false);

  // Stable callback refs
  const onAutoStopRef = useRef(onAutoStop);
  const onPitchContourRef = useRef(onPitchContour);
  useEffect(() => { onAutoStopRef.current = onAutoStop; }, [onAutoStop]);
  useEffect(() => { onPitchContourRef.current = onPitchContour; }, [onPitchContour]);

  // ── Helper: compute maxDur from prosody (same formula as original) ──
  const getMaxDur = useCallback(() => {
    const totalSyl = prosodyData.flatMap(d => d.syllables).length;
    return Math.max(2400, totalSyl * 300);
  }, [prosodyData]);

  // ── Helper: get all syllables ──
  const getAllSyllables = useCallback(() => {
    return prosodyData.flatMap(d => d.syllables);
  }, [prosodyData]);

  // ── Build synthetic contour from prosody for target ──
  const getSyntheticAmp = useCallback((syllables: ReturnType<typeof getAllSyllables>, index: number): number => {
    const syl = syllables[index];
    if (!syl) return 0.3;
    if (syl.pitch === 2 && syl.stress === 2) return 0.95;
    if (syl.pitch === 2 && syl.stress === 1) return 0.8;
    if (syl.pitch === 2) return 0.7;
    if (syl.stress === 2) return 0.78;
    if (syl.stress === 1) return 0.55;
    if (syl.pitch === -1) return 0.1;
    return 0.35;
  }, []);

  // ── Target (cyan) animation — uses identical history-push algorithm ──
  useEffect(() => {
    if (!isPlayingModel) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    targetHistory.current = [];
    targetStartRef.current = Date.now();
    showTarget.current = true;

    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;

    const allSyl = getAllSyllables();
    const maxDur = getMaxDur();
    let lastY = h / 2;

    const tick = () => {
      const elapsed = Date.now() - targetStartRef.current;
      const x = (elapsed / maxDur) * w;

      // Determine amplitude from model contour or synthetic prosody
      let amp: number;
      if (modelContour.length > 0) {
        // Map elapsed time to model contour index
        const idx = Math.floor((elapsed / maxDur) * modelContour.length);
        const val = modelContour[Math.min(idx, modelContour.length - 1)] ?? 0.5;
        amp = val; // already 0-1 normalized
      } else {
        // Synthetic from prosody
        const estIdx = Math.floor((x / w) * allSyl.length);
        amp = getSyntheticAmp(allSyl, estIdx);
      }

      // Convert amp to y — full canvas height
      let y = h * 0.9 - (amp * h * 0.8);
      // Smoothing
      y = lastY * 0.6 + y * 0.4;
      y = Math.max(10, Math.min(h - 10, y));
      lastY = y;

      // Mismatch detection (not applicable for target, always false)
      targetHistory.current.push({ x, y, mismatch: false });

      // ── Redraw everything ──
      ctx.clearRect(0, 0, w, h);
      // Midline
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Target (cyan)
      drawHistory(ctx, targetHistory.current, w, h, "#22d3ee", "#f87171", "#22d3ee");

      // Live (green) — persist from previous recording
      if (showLive.current && liveHistory.current.length > 0) {
        drawHistory(ctx, liveHistory.current, w, h, "#a3e635", "#f87171", "#a3e635");
      }

      if (x < w && isPlayingModel) {
        requestAnimationFrame(tick);
      }
    };

    const rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlayingModel, modelContour, prosodyData, getAllSyllables, getMaxDur, getSyntheticAmp]);

  // ── Live (green) recording — original LiveInputVisualizer logic ──
  useEffect(() => {
    if (!isRecording) {
      // Stop mic, save contour for scoring
      if (micRef.current) {
        const contour = micRef.current.tracker.stop();
        if (onPitchContourRef.current && contour.length > 0) {
          onPitchContourRef.current(contour);
        }
        micRef.current.stream.getTracks().forEach(t => t.stop());
        micRef.current.ctx.close().catch(() => {});
        if (micRef.current.req) cancelAnimationFrame(micRef.current.req);
        micRef.current = null;
      }
      return;
    }

    // Starting recording
    const canvas = canvasRef.current;
    if (!canvas) return;

    liveHistory.current = [];
    silenceStartRef.current = null;
    hasSpokenRef.current = false;
    autoStopTriggeredRef.current = false;
    showLive.current = true;
    liveStartRef.current = Date.now();

    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;

    const allSyl = getAllSyllables();
    const maxDur = getMaxDur();

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const aCtx = new AudioContext();
        const analyser = aCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.3;
        aCtx.createMediaStreamSource(stream).connect(analyser);
        const tracker = new RealtimePitchTracker(analyser, aCtx.sampleRate);
        tracker.start();
        micRef.current = { ctx: aCtx, analyser, stream, tracker, req: null };
        draw();
      } catch {
        /* mic denied — no visualisation */
      }
    };

    const draw = () => {
      if (!micRef.current?.analyser) return;
      const analyser = micRef.current.analyser;
      const tracker = micRef.current.tracker;

      // Read raw RMS for silence detection only
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rawAmp = Math.sqrt(sum / data.length);

      // Auto-stop silence detection with speech gate (one-shot)
      if (onAutoStopRef.current && !autoStopTriggeredRef.current) {
        if (rawAmp > 0.05) {
          hasSpokenRef.current = true;
          silenceStartRef.current = null;
        } else if (hasSpokenRef.current) {
          if (!silenceStartRef.current) silenceStartRef.current = Date.now();
          if (Date.now() - silenceStartRef.current > 1000) {
            autoStopTriggeredRef.current = true;
            onAutoStopRef.current();
            return;
          }
        }
      }

      // Use pitch (F0) from tracker — same signal type as target line
      const amp = tracker.currentValue;

      // Y position from pitch — full canvas height (same formula as target)
      let y = h * 0.9 - (amp * h * 0.8);
      if (liveHistory.current.length > 0) {
        y = liveHistory.current[liveHistory.current.length - 1].y * 0.6 + y * 0.4;
      }
      y = Math.max(10, Math.min(h - 10, y));

      // X from elapsed time — clamp for drawing
      const x = Math.min(((Date.now() - liveStartRef.current) / maxDur) * w, w);

      // Mismatch detection using pitch
      const estIdx = Math.floor((x / w) * allSyl.length);
      let mismatch = false;
      if (allSyl[estIdx]) {
        const high = allSyl[estIdx].pitch === 2;
        if (high && amp < 0.2) mismatch = true;
        if (!high && amp > 0.6) mismatch = true;
      }

      liveHistory.current.push({ x, y, mismatch });

      // ── Redraw everything ──
      ctx.clearRect(0, 0, w, h);
      // Midline
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Target (cyan) — persist from model playback
      if (showTarget.current && targetHistory.current.length > 0) {
        drawHistory(ctx, targetHistory.current, w, h, "#22d3ee", "#f87171", "#22d3ee");
      }

      // Live (green)
      drawHistory(ctx, liveHistory.current, w, h, "#a3e635", "#f87171", "#a3e635");

      // Keep RAF running for silence detection even past canvas width
      if (isRecording) {
        micRef.current!.req = requestAnimationFrame(draw);
      }
    };

    setTimeout(() => initMic(), 20);

    return () => {
      if (micRef.current?.req) cancelAnimationFrame(micRef.current.req);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // ── Clear histories when model contour changes (new sentence) ──
  const prevModelLen = useRef(modelContour.length);
  useEffect(() => {
    if (modelContour.length !== prevModelLen.current) {
      if (modelContour.length === 0) {
        liveHistory.current = [];
        targetHistory.current = [];
        showLive.current = false;
        showTarget.current = false;
      }
      prevModelLen.current = modelContour.length;
    }
  }, [modelContour]);

  // ── Static render when idle (show persisted histories) ──
  useEffect(() => {
    if (isRecording || isPlayingModel) return;
    // Only render if we have something to show
    if (!showLive.current && !showTarget.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);
    // Midline
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (showTarget.current && targetHistory.current.length > 0) {
      drawHistory(ctx, targetHistory.current, w, h, "#22d3ee", "#f87171", "#22d3ee");
    }
    if (showLive.current && liveHistory.current.length > 0) {
      drawHistory(ctx, liveHistory.current, w, h, "#a3e635", "#f87171", "#a3e635");
    }
  }, [isRecording, isPlayingModel, activeWordIndex]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
