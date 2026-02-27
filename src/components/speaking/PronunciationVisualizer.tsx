/**
 * PronunciationVisualizer — from-scratch dual-line pitch visualizer.
 *
 * Target line (cyan): deterministic, driven by prosody data + activeWordIndex.
 *   No mic needed. Renders in perfect sync with TTS onBoundary events.
 *
 * Live line (green): mic-based F0 detection using `pitchy` (McLeod Pitch Method).
 *   Normalized to the same 0-1 scale as the target for direct comparison.
 */
import { useRef, useEffect, useCallback } from "react";
import { PitchDetector } from "pitchy";
import type { WordData } from "@/lib/prosody";

/* ── Props ── */
interface Props {
  /** True while the student is recording */
  isRecording: boolean;
  /** True while TTS is speaking the model sentence */
  isPlayingModel: boolean;
  /** Current word being spoken by TTS (-1 = none) */
  activeWordIndex: number;
  /** Prosody analysis of the current sentence */
  prosodyData: WordData[];
  /** Called after 1 s of silence post-speech to auto-stop recording */
  onAutoStop?: () => void;
  /** Called with the recorded pitch contour when recording stops */
  onPitchContour?: (contour: number[]) => void;
}

/* ── Constants ── */
const MIN_FREQ = 80;
const MAX_FREQ = 600;

/* ── History point for drawing ── */
interface Pt {
  x: number;
  y: number;
  mismatch: boolean;
}

/* ── Prosody → 0-1 normalized value (shared scale) ── */
function prosodyToNorm(syl: { stress: number; pitch: number } | undefined, isFunc: boolean): number {
  if (!syl) return 0.4;
  if (isFunc) return 0.3;
  if (syl.stress === 2 && syl.pitch === 2) return 0.85;
  if (syl.pitch === 2 && syl.stress >= 1) return 0.75;
  if (syl.pitch === 2) return 0.65;
  if (syl.stress === 2) return 0.7;
  if (syl.stress === 1) return 0.5;
  if (syl.pitch === -1) return 0.2;
  return 0.4;
}

/* ── Hz → 0-1 ── */
function normalizeHz(hz: number): number {
  return Math.max(0, Math.min(1, (hz - MIN_FREQ) / (MAX_FREQ - MIN_FREQ)));
}

/* ── Y from normalized value ── */
function normToY(v: number, h: number): number {
  return h * 0.9 - v * h * 0.8;
}

/* ── Draw a line from history points ── */
function drawLine(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  h: number,
  color: string,
  mismatchColor: string,
) {
  if (pts.length < 2) return;

  // Lead-in from midline
  if (pts[0].x > 0) {
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(pts[0].x, pts[0].y);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    ctx.quadraticCurveTo(a.x, a.y, mx, my);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = b.mismatch ? mismatchColor : color;
    ctx.shadowColor = b.mismatch ? mismatchColor : color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.shadowBlur = 8;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

/* ── Midline helper ── */
function drawMidline(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
}

/* ══════════════════════════════════════════════════════════════ */

export default function PronunciationVisualizer({
  isRecording,
  isPlayingModel,
  activeWordIndex,
  prosodyData,
  onAutoStop,
  onPitchContour,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── History refs ──
  const targetPts = useRef<Pt[]>([]);
  const livePts = useRef<Pt[]>([]);
  const showTarget = useRef(false);
  const showLive = useRef(false);

  // ── Target animation state ──
  const targetStart = useRef(0);
  const lastTargetY = useRef<number | null>(null);
  const targetRafId = useRef<number | null>(null);
  const prevWordIdx = useRef(-1);

  // ── Live mic refs ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const micRef = useRef<{
    audioCtx: AudioContext;
    stream: MediaStream;
    analyser: AnalyserNode;
    detector: any;
    inputBuf: Float32Array<ArrayBuffer>;
    contour: number[];
    rafId: number | null;
  } | null>(null);
  const liveStart = useRef(0);
  const lastLiveY = useRef<number | null>(null);

  // Silence detection
  const silenceStart = useRef<number | null>(null);
  const hasSpoken = useRef(false);
  const autoStopped = useRef(false);

  // Stable refs for callbacks
  const onAutoStopRef = useRef(onAutoStop);
  const onPitchContourRef = useRef(onPitchContour);
  useEffect(() => { onAutoStopRef.current = onAutoStop; }, [onAutoStop]);
  useEffect(() => { onPitchContourRef.current = onPitchContour; }, [onPitchContour]);

  // ── Max duration (time axis) ──
  const getMaxDur = useCallback(() => {
    const totalSyl = prosodyData.flatMap((d) => d.syllables).length;
    return Math.max(2400, totalSyl * 300);
  }, [prosodyData]);

  // ── Canvas sizing helper ──
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }, []);

  // ── Redraw everything (shared) ──
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
    drawMidline(ctx, w, h);
    if (showTarget.current && targetPts.current.length > 1) {
      drawLine(ctx, targetPts.current, h, "#22d3ee", "#f87171");
    }
    if (showLive.current && livePts.current.length > 1) {
      drawLine(ctx, livePts.current, h, "#a3e635", "#f87171");
    }
  }, []);

  /* ═══════════════════════════════════════════════════════════
   * TARGET LINE — driven by activeWordIndex changes from TTS
   * ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isPlayingModel) {
      // Stopped playing — cancel any ongoing animation
      if (targetRafId.current) cancelAnimationFrame(targetRafId.current);
      targetRafId.current = null;
      prevWordIdx.current = -1;
      lastTargetY.current = null;
      return;
    }

    // Just started playing
    if (targetPts.current.length === 0) {
      targetPts.current = [];
      targetStart.current = Date.now();
      showTarget.current = true;
      lastTargetY.current = null;
      prevWordIdx.current = -1;
      setupCanvas();
    }
  }, [isPlayingModel, setupCanvas]);

  // Push target points on each word boundary
  useEffect(() => {
    if (!isPlayingModel || activeWordIndex < 0) return;
    if (activeWordIndex === prevWordIdx.current) return;
    prevWordIdx.current = activeWordIndex;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const maxDur = getMaxDur();
    const elapsed = Date.now() - targetStart.current;
    const x = Math.min((elapsed / maxDur) * w, w);

    const word = prosodyData[activeWordIndex];
    if (!word) return;

    // Push a point for each syllable in this word, spread across a small time window
    const sylCount = word.syllables.length;
    const sylTimeSpan = 180; // ms estimate per syllable
    for (let si = 0; si < sylCount; si++) {
      const syl = word.syllables[si];
      const norm = prosodyToNorm(syl, word.isFunc);
      let y = normToY(norm, h);
      // Smooth
      if (lastTargetY.current !== null) {
        y = lastTargetY.current * 0.5 + y * 0.5;
      }
      y = Math.max(8, Math.min(h - 8, y));
      lastTargetY.current = y;

      const sx = Math.min(x + si * ((sylTimeSpan / maxDur) * w), w);
      targetPts.current.push({ x: sx, y, mismatch: false });
    }

    redraw();
  }, [activeWordIndex, isPlayingModel, prosodyData, getMaxDur, redraw]);

  // Smooth interpolation animation while TTS is playing
  useEffect(() => {
    if (!isPlayingModel) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const maxDur = getMaxDur();

    const tick = () => {
      if (!isPlayingModel) return;
      const elapsed = Date.now() - targetStart.current;
      const x = Math.min((elapsed / maxDur) * w, w);

      // If we have points, extend a trailing interpolation point at current time
      if (targetPts.current.length > 0) {
        const lastPt = targetPts.current[targetPts.current.length - 1];
        // Only extend if time has moved past last point
        if (x > lastPt.x + 2) {
          // Gentle decay toward midline when no new word event
          let y = lastPt.y * 0.97 + (h / 2) * 0.03;
          y = Math.max(8, Math.min(h - 8, y));
          targetPts.current.push({ x, y, mismatch: false });
        }
      }

      redraw();
      targetRafId.current = requestAnimationFrame(tick);
    };

    targetRafId.current = requestAnimationFrame(tick);
    return () => {
      if (targetRafId.current) cancelAnimationFrame(targetRafId.current);
    };
  }, [isPlayingModel, getMaxDur, redraw]);

  /* ═══════════════════════════════════════════════════════════
   * LIVE LINE — mic-based F0 via pitchy
   * ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isRecording) {
      // Stop mic, emit contour
      if (micRef.current) {
        const contour = micRef.current.contour;
        if (onPitchContourRef.current && contour.length > 0) {
          onPitchContourRef.current([...contour]);
        }
        if (micRef.current.rafId) cancelAnimationFrame(micRef.current.rafId);
        micRef.current.stream.getTracks().forEach((t) => t.stop());
        micRef.current.audioCtx.close().catch(() => {});
        micRef.current = null;
      }
      return;
    }

    // Starting a new recording
    livePts.current = [];
    showLive.current = true;
    liveStart.current = Date.now();
    lastLiveY.current = null;
    silenceStart.current = null;
    hasSpoken.current = false;
    autoStopped.current = false;

    const dims = setupCanvas();
    if (!dims) return;
    const { w, h } = dims;
    const maxDur = getMaxDur();
    const allSyl = prosodyData.flatMap((d) => d.syllables);

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);

        const inputBuf = new Float32Array(analyser.fftSize);
        const detector = PitchDetector.forFloat32Array(inputBuf.length);
        const contour: number[] = [];

        micRef.current = { audioCtx, stream, analyser, detector, inputBuf, contour, rafId: null };

        const draw = () => {
          if (!micRef.current) return;
          const { analyser: an, detector: det, inputBuf: buf, contour: con } = micRef.current;

          // Get time-domain data
          an.getFloatTimeDomainData(buf);
          // Copy to a clean ArrayBuffer-backed Float32Array for pitchy
          const cleanBuf = new Float32Array(buf);

          // RMS for silence detection
          let rms = 0;
          for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
          rms = Math.sqrt(rms / buf.length);

          // Auto-stop logic
          if (onAutoStopRef.current && !autoStopped.current) {
            if (rms > 0.05) {
              hasSpoken.current = true;
              silenceStart.current = null;
            } else if (hasSpoken.current) {
              if (!silenceStart.current) silenceStart.current = Date.now();
              if (Date.now() - silenceStart.current > 1000) {
                autoStopped.current = true;
                onAutoStopRef.current();
                return;
              }
            }
          }

          // Pitch detection via pitchy
          // @ts-ignore - pitchy typing mismatch with ArrayBufferLike vs ArrayBuffer
          const [pitch, clarity] = det.findPitch(buf, audioCtx.sampleRate);
          let norm = 0;
          if (clarity > 0.85 && pitch >= MIN_FREQ && pitch <= MAX_FREQ) {
            norm = normalizeHz(pitch);
            con.push(norm);
          }

          // Y position
          let y = normToY(norm, h);
          if (lastLiveY.current !== null) {
            y = lastLiveY.current * 0.55 + y * 0.45;
          }
          y = Math.max(8, Math.min(h - 8, y));
          lastLiveY.current = y;

          // X position
          const elapsed = Date.now() - liveStart.current;
          const x = Math.min((elapsed / maxDur) * w, w);

          // Mismatch detection
          const estIdx = Math.floor((x / w) * allSyl.length);
          let mismatch = false;
          if (allSyl[estIdx] && norm > 0) {
            const high = allSyl[estIdx].pitch === 2;
            if (high && norm < 0.25) mismatch = true;
            if (!high && norm > 0.7) mismatch = true;
          }

          livePts.current.push({ x, y, mismatch });
          redraw();

          micRef.current!.rafId = requestAnimationFrame(draw);
        };

        draw();
      } catch {
        /* mic denied */
      }
    };

    setTimeout(() => initMic(), 20);

    return () => {
      if (micRef.current?.rafId) cancelAnimationFrame(micRef.current.rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  /* ═══════════════════════════════════════════════════════════
   * Clear histories on new sentence (prosodyData changes)
   * ═══════════════════════════════════════════════════════════ */
  const prevProsodyLen = useRef(prosodyData.length);
  useEffect(() => {
    if (prosodyData.length !== prevProsodyLen.current) {
      targetPts.current = [];
      livePts.current = [];
      showTarget.current = false;
      showLive.current = false;
      lastTargetY.current = null;
      lastLiveY.current = null;
      prevProsodyLen.current = prosodyData.length;
    }
  }, [prosodyData]);

  /* ═══════════════════════════════════════════════════════════
   * Idle redraw (persist lines when neither active)
   * ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (isRecording || isPlayingModel) return;
    if (!showTarget.current && !showLive.current) return;

    const dims = setupCanvas();
    if (!dims) return;
    redraw();
  }, [isRecording, isPlayingModel, activeWordIndex, setupCanvas, redraw]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
