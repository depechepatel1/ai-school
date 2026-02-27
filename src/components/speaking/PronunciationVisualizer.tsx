/**
 * PronunciationVisualizer — dual-canvas: target contour + live user line.
 * 
 * Performance optimizations:
 * - Fix 1: O(1) peak envelope follower (replaces per-frame array sort)
 * - Fix 2: Float32Array ring buffer + batched lineTo paths (replaces unbounded history + per-segment bezierCurveTo)
 * - Fix 3: Single master RAF loop in parent (eliminates dual-loop micro-stutters)
 * - Fix 4: ResizeObserver + cached dimensions/gradients (eliminates per-frame getBoundingClientRect)
 * - Fix 5: desynchronized canvas context for lower latency
 */
import { useRef, useEffect, useCallback, useState } from "react";
import { MicOff } from "lucide-react";
import type { WordData } from "@/lib/prosody";

interface Props {
  isRecording: boolean;
  isPlayingModel: boolean;
  activeWordIndex: number;
  prosodyData: WordData[];
  targetProgress: number;
  sentenceKey: number;
  onAutoStop?: () => void;
  onPitchContour?: (contour: number[]) => void;
}

/* ── Constants ── */
const MAX_POINTS = 600; // ring buffer capacity
const RING_STRIDE = 3;  // [x, y, mismatch] per point
const PEAK_DECAY = 0.95;
const PAD = 8;

/* ── Shared helpers ── */
function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.7);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawDashedMidline(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.setLineDash([8, 12]);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.restore();
}

function drawGridLines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.setLineDash([4, 16]);
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (const frac of [0.25, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(0, h * frac);
    ctx.lineTo(w, h * frac);
    ctx.stroke();
  }
  ctx.restore();
}

/** Apply DPR scaling to a canvas. Returns true if resized. */
function applyCanvasDpr(canvas: HTMLCanvasElement, w: number, h: number): boolean {
  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(w * dpr);
  const targetH = Math.round(h * dpr);
  const resized = canvas.width !== targetW || canvas.height !== targetH;
  if (resized) {
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d", { desynchronized: true });
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return resized;
}

/* ═══════════════════════════════════════════════════════════════
 * TargetContourCanvas — boundary-driven progressive reveal
 * Render callback is invoked by the parent's master RAF loop.
 * ═══════════════════════════════════════════════════════════════ */
function TargetContourCanvas({
  data,
  targetProgress,
  isPlaying,
  renderRef,
  dims,
}: {
  data: WordData[];
  targetProgress: number;
  isPlaying: boolean;
  renderRef: React.MutableRefObject<(() => void) | null>;
  dims: React.MutableRefObject<{ w: number; h: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animProgressRef = useRef(0);
  const targetProgressRef = useRef(targetProgress);
  const isPlayingRef = useRef(isPlaying);
  const cachedGradRef = useRef<{ stroke: CanvasGradient; fill: CanvasGradient; w: number; h: number } | null>(null);

  useEffect(() => { targetProgressRef.current = targetProgress; }, [targetProgress]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Recompute cached gradients when dimensions change
  const ensureGradients = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const c = cachedGradRef.current;
    if (c && c.w === w && c.h === h) return c;
    const stroke = ctx.createLinearGradient(0, 0, w, 0);
    stroke.addColorStop(0, "#22d3ee");
    stroke.addColorStop(1, "#3b82f6");
    const fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, "rgba(34,211,238,0.18)");
    fill.addColorStop(1, "rgba(34,211,238,0)");
    const entry = { stroke, fill, w, h };
    cachedGradRef.current = entry;
    return entry;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { desynchronized: true })!;
    const allSyllables = data.flatMap((d) => d.syllables);
    animProgressRef.current = 0;

    const computePoints = (w: number, h: number) => {
      if (allSyllables.length === 0) return [];
      const segW = w / Math.max(1, allSyllables.length - 1);
      return allSyllables.map((s, i) => ({
        x: i * segW,
        y: s.pitch === 2 ? (s.stress === 2 ? h * 0.15 : h * 0.35) : s.pitch === -1 ? h * 0.80 : h * 0.60,
      }));
    };

    // Register render callback for master loop
    renderRef.current = () => {
      const { w, h } = dims.current;
      if (w === 0 || h === 0) return;
      applyCanvasDpr(canvas, w, h);

      const target = targetProgressRef.current;
      const diff = target - animProgressRef.current;
      if (Math.abs(diff) > 0.001) {
        animProgressRef.current += diff * 0.15;
      } else {
        animProgressRef.current = target;
      }

      ctx.clearRect(0, 0, w, h);
      drawVignette(ctx, w, h);
      drawGridLines(ctx, w, h);
      drawDashedMidline(ctx, w, h);

      const points = computePoints(w, h);
      if (points.length === 0) return;

      const visibleCount = Math.max(1, Math.ceil(animProgressRef.current * points.length));
      const visiblePoints = points.slice(0, visibleCount);

      // Draw contour (bezier is fine here — only ~20-40 points)
      ctx.beginPath();
      ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      for (let i = 1; i < visiblePoints.length; i++) {
        const prev = visiblePoints[i - 1];
        const curr = visiblePoints[i];
        ctx.bezierCurveTo(
          prev.x + (curr.x - prev.x) * 0.4, prev.y,
          prev.x + (curr.x - prev.x) * 0.6, curr.y,
          curr.x, curr.y,
        );
      }

      const grads = ensureGradients(ctx, w, h);
      ctx.strokeStyle = grads.stroke;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Fill beneath
      ctx.lineTo(visiblePoints[visiblePoints.length - 1].x, h);
      ctx.lineTo(visiblePoints[0].x, h);
      ctx.closePath();
      ctx.fillStyle = grads.fill;
      ctx.fill();

      // Progress dot while playing
      if (isPlayingRef.current && animProgressRef.current < 1) {
        const lastPt = visiblePoints[visiblePoints.length - 1];
        const baseRadius = 5 + Math.sin(Date.now() * 0.008) * 2;
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, baseRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    return () => { renderRef.current = null; };
  }, [data, renderRef, dims, ensureGradients]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-[inherit]" />;
}

/* ═══════════════════════════════════════════════════════════════
 * LiveInputCanvas — ring buffer + peak envelope + batched paths
 * ═══════════════════════════════════════════════════════════════ */

interface LiveState {
  ctx?: AudioContext;
  analyser?: AnalyserNode;
  stream?: MediaStream;
  // Ring buffer: [x, y, mismatch(0|1)] triples
  ringBuf: Float32Array;
  ringIdx: number;
  ringCount: number;
  ampHistory: number[];
  smoothAmp: number;
  smoothCentroid: number;
  noiseFloor: number;
  peakAmp: number;
  smoothY: number;
  startTime: number;
  silenceStart: number | null;
  speechDetected: boolean; // Gate: require speech before silence countdown
  calibrationSamples: number[]; // Noise floor calibration
  calibrated: boolean;
  stopped: boolean;
}

function LiveInputCanvas({
  isRecording,
  prosodyData,
  sentenceKey,
  onAutoStop,
  onPitchContour,
  renderRef,
  dims,
}: {
  isRecording: boolean;
  prosodyData: WordData[];
  sentenceKey: number;
  onAutoStop?: () => void;
  onPitchContour?: (contour: number[]) => void;
  renderRef: React.MutableRefObject<(() => void) | null>;
  dims: React.MutableRefObject<{ w: number; h: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [micDenied, setMicDenied] = useState(false);
  const stateRef = useRef<LiveState>({
    ringBuf: new Float32Array(MAX_POINTS * RING_STRIDE),
    ringIdx: 0,
    ringCount: 0,
    ampHistory: [],
    smoothAmp: 0,
    smoothCentroid: 0.5,
    noiseFloor: 0.01,
    peakAmp: 0.001,
    smoothY: 0,
    startTime: 0,
    silenceStart: null,
    speechDetected: false,
    calibrationSamples: [],
    calibrated: false,
    stopped: false,
  });
  const onAutoStopRef = useRef(onAutoStop);
  const onPitchContourRef = useRef(onPitchContour);
  const cachedFillGradRef = useRef<{ grad: CanvasGradient; h: number } | null>(null);

  useEffect(() => { onAutoStopRef.current = onAutoStop; }, [onAutoStop]);
  useEffect(() => { onPitchContourRef.current = onPitchContour; }, [onPitchContour]);

  // Reset on new sentence
  useEffect(() => {
    const s = stateRef.current;
    s.ringBuf.fill(0);
    s.ringIdx = 0;
    s.ringCount = 0;
    s.ampHistory = [];
    s.smoothAmp = 0;
    s.smoothCentroid = 0.5;
    s.noiseFloor = 0.01;
    s.peakAmp = 0.001;
    s.smoothY = 0;
    s.speechDetected = false;
    s.calibrationSamples = [];
    s.calibrated = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx2d = canvas.getContext("2d", { desynchronized: true });
      if (ctx2d) {
        const { w, h } = dims.current;
        ctx2d.clearRect(0, 0, w, h);
      }
    }
  }, [sentenceKey, dims]);

  useEffect(() => {
    const s = stateRef.current;

    if (!isRecording) {
      s.stopped = true;
      if (onPitchContourRef.current && s.ampHistory.length > 0) {
        onPitchContourRef.current([...s.ampHistory]);
      }
      if (s.stream) s.stream.getTracks().forEach((t) => t.stop());
      if (s.ctx) s.ctx.close().catch(() => {});
      s.ctx = undefined;
      s.analyser = undefined;
      s.stream = undefined;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = dims.current;
    applyCanvasDpr(canvas, w, h);
    const ctx2d = canvas.getContext("2d", { desynchronized: true })!;

    // Reset for new recording
    s.ringBuf.fill(0);
    s.ringIdx = 0;
    s.ringCount = 0;
    s.ampHistory = [];
    s.smoothAmp = 0;
    s.smoothCentroid = 0.5;
    s.noiseFloor = 0.01;
    s.peakAmp = 0.001;
    s.smoothY = h / 2;
    s.stopped = false;
    s.silenceStart = null;
    s.speechDetected = false;
    s.calibrationSamples = [];
    s.calibrated = false;
    ctx2d.clearRect(0, 0, w, h);
    cachedFillGradRef.current = null;

    const allSyl = prosodyData.flatMap((d) => d.syllables);
    const totalSyl = allSyl.length;
    const maxDur = Math.max(5000, totalSyl * 500);

    // Draw from ring buffer: continuous green base line + red overlay for mismatch
    const drawLine = (cw: number, ch: number) => {
      ctx2d.clearRect(0, 0, cw, ch);
      const count = s.ringCount;
      if (count < 2) return;

      const buf = s.ringBuf;
      const startRead = count >= MAX_POINTS ? s.ringIdx : 0;
      const total = Math.min(count, MAX_POINTS);

      // Pass 1: continuous green base line (all points)
      ctx2d.beginPath();
      for (let i = 0; i < total; i++) {
        const idx = ((startRead + i) % MAX_POINTS) * RING_STRIDE;
        const x = buf[idx];
        const y = buf[idx + 1];
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
      }
      ctx2d.strokeStyle = "#a3e635";
      ctx2d.shadowColor = "#a3e635";
      ctx2d.lineWidth = 4;
      ctx2d.lineCap = "round";
      ctx2d.lineJoin = "round";
      ctx2d.shadowBlur = 16;
      ctx2d.stroke();

      // Pass 2: red overlay on mismatch segments
      ctx2d.beginPath();
      let inRed = false;
      for (let i = 0; i < total; i++) {
        const idx = ((startRead + i) % MAX_POINTS) * RING_STRIDE;
        const x = buf[idx];
        const y = buf[idx + 1];
        const mis = buf[idx + 2] >= 0.5;

        if (mis) {
          if (!inRed) {
            // Start red segment — connect from previous point for continuity
            if (i > 0) {
              const prevIdx = ((startRead + i - 1) % MAX_POINTS) * RING_STRIDE;
              ctx2d.moveTo(buf[prevIdx], buf[prevIdx + 1]);
              ctx2d.lineTo(x, y);
            } else {
              ctx2d.moveTo(x, y);
            }
            inRed = true;
          } else {
            ctx2d.lineTo(x, y);
          }
        } else {
          if (inRed) {
            // End red segment — extend to this point for seamless transition
            ctx2d.lineTo(x, y);
            inRed = false;
          }
        }
      }
      ctx2d.strokeStyle = "#f87171";
      ctx2d.shadowColor = "#f87171";
      ctx2d.lineWidth = 4;
      ctx2d.lineCap = "round";
      ctx2d.lineJoin = "round";
      ctx2d.shadowBlur = 24;
      ctx2d.stroke();
      ctx2d.shadowBlur = 0;

      // Fill beneath — single pass, all points
      ctx2d.beginPath();
      let firstX = 0, lastX = 0;
      for (let i = 0; i < total; i++) {
        const idx = ((startRead + i) % MAX_POINTS) * RING_STRIDE;
        const x = buf[idx];
        const y = buf[idx + 1];
        if (i === 0) { ctx2d.moveTo(x, y); firstX = x; }
        else ctx2d.lineTo(x, y);
        lastX = x;
      }
      ctx2d.lineTo(lastX, ch);
      ctx2d.lineTo(firstX, ch);
      ctx2d.closePath();

      // Cached fill gradient
      let fg = cachedFillGradRef.current;
      if (!fg || fg.h !== ch) {
        const g = ctx2d.createLinearGradient(0, 0, 0, ch);
        g.addColorStop(0, "rgba(163,230,53,0.15)");
        g.addColorStop(1, "rgba(163,230,53,0)");
        fg = { grad: g, h: ch };
        cachedFillGradRef.current = fg;
      }
      ctx2d.fillStyle = fg.grad;
      ctx2d.fill();

      // Head dot — newest point
      const headRingIdx = ((s.ringIdx - 1 + MAX_POINTS) % MAX_POINTS) * RING_STRIDE;
      const headX = buf[headRingIdx];
      const headY = buf[headRingIdx + 1];
      const headMis = buf[headRingIdx + 2] >= 0.5;
      const radius = 5 + Math.sin(Date.now() * 0.008) * 2;
      const headColor = headMis ? "#f87171" : "#a3e635";

      ctx2d.beginPath();
      ctx2d.arc(headX, headY, radius + 3, 0, Math.PI * 2);
      ctx2d.fillStyle = headMis ? "rgba(248,113,113,0.15)" : "rgba(163,230,53,0.15)";
      ctx2d.fill();
      ctx2d.beginPath();
      ctx2d.arc(headX, headY, radius, 0, Math.PI * 2);
      ctx2d.fillStyle = headColor;
      ctx2d.shadowColor = headColor;
      ctx2d.shadowBlur = 14;
      ctx2d.fill();
      ctx2d.shadowBlur = 0;
    };

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const aCtx = new AudioContext();
        const analyser = aCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.4;
        const src = aCtx.createMediaStreamSource(stream);
        src.connect(analyser);
        s.ctx = aCtx;
        s.analyser = analyser;
        s.stream = stream;
        s.startTime = Date.now();

        const timeBuf = new Uint8Array(analyser.frequencyBinCount);
        const freqBuf = new Uint8Array(analyser.frequencyBinCount);

        // Register render callback for master RAF loop
        renderRef.current = () => {
          if (s.stopped || !s.analyser) return;
          const { w: cw, h: ch } = dims.current;
          if (cw === 0 || ch === 0) return;
          applyCanvasDpr(canvas, cw, ch);

          s.analyser.getByteTimeDomainData(timeBuf);
          s.analyser.getByteFrequencyData(freqBuf);

          // RMS energy
          let sum = 0;
          for (let i = 0; i < timeBuf.length; i++) {
            const v = (timeBuf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / timeBuf.length);

          // Noise floor calibration: first 500ms collects samples
          const elapsed = Date.now() - s.startTime;
          if (!s.calibrated) {
            s.calibrationSamples.push(rms);
            if (elapsed >= 500 && s.calibrationSamples.length > 0) {
              // Use median of calibration samples as noise floor
              const sorted = [...s.calibrationSamples].sort((a, b) => a - b);
              s.noiseFloor = Math.max(0.005, sorted[Math.floor(sorted.length / 2)]);
              s.calibrated = true;
              s.calibrationSamples = []; // free memory
            }
          } else {
            // Slow bidirectional adaptation after calibration
            if (rms < s.noiseFloor * 1.5) {
              s.noiseFloor = s.noiseFloor * 0.998 + rms * 0.002;
            }
          }

          // Peak envelope follower — O(1)
          if (rms > s.peakAmp) {
            s.peakAmp = rms;
          } else {
            s.peakAmp = Math.max(0.001, s.peakAmp * PEAK_DECAY);
          }
          let normAmp = Math.min(1, rms / s.peakAmp);
          if (rms > s.noiseFloor * 1.5 && normAmp < 0.14) normAmp = 0.14;

          // Spectral centroid
          let weightedSum = 0, magSum = 0;
          for (let fi = 0; fi < freqBuf.length; fi++) {
            weightedSum += fi * freqBuf[fi];
            magSum += freqBuf[fi];
          }
          const rawCentroid = magSum > 0 ? (weightedSum / magSum) / freqBuf.length : 0.5;

          // Smooth input features
          s.smoothAmp = s.smoothAmp * 0.70 + normAmp * 0.30;
          s.smoothCentroid = s.smoothCentroid * 0.80 + rawCentroid * 0.20;
          s.ampHistory.push(s.smoothAmp);

          // Auto-stop: 1s silence AFTER speech detected
          const speechThreshold = s.noiseFloor * 3.5;
          if (onAutoStopRef.current && s.calibrated) {
            if (rms > speechThreshold) {
              s.speechDetected = true;
              s.silenceStart = null; // reset silence timer on speech
            } else if (s.speechDetected) {
              // Only start silence countdown after speech was detected
              if (!s.silenceStart) s.silenceStart = Date.now();
              if (Date.now() - s.silenceStart > 1000) {
                onAutoStopRef.current();
                return;
              }
            }
          }

          // Y mapping — spectral centroid drives vertical position (pitch proxy)
          // Maps to same tier system as target: high centroid → top, low → bottom
          const drawableRange = ch - PAD * 2;
          // Centroid 0.0→1.0 maps to bottom→top of drawable range
          const centroidY = PAD + drawableRange * (1 - s.smoothCentroid);
          // Amplitude gates displacement from midline — quiet speech hugs center
          const midY = ch / 2;
          const ampGate = Math.min(1, s.smoothAmp * 2.5); // 0→1 as speech gets louder
          let targetY = midY + (centroidY - midY) * ampGate;
          targetY = s.smoothY * 0.65 + targetY * 0.35; // smooth transitions
          targetY = Math.max(PAD, Math.min(ch - PAD, targetY));
          s.smoothY = targetY;

          const x = Math.min(cw, (elapsed / maxDur) * cw);

          // Mismatch detection
          const estIdx = Math.min(totalSyl - 1, Math.floor((x / cw) * totalSyl));
          let mismatch = false;
          if (allSyl[estIdx]) {
            const high = allSyl[estIdx].pitch === 2;
            if (high && normAmp < 0.2) mismatch = true;
            if (!high && normAmp > 0.8) mismatch = true;
          }

          // Fix 2: Write to ring buffer
          const wi = s.ringIdx * RING_STRIDE;
          s.ringBuf[wi] = x;
          s.ringBuf[wi + 1] = targetY;
          s.ringBuf[wi + 2] = mismatch ? 1 : 0;
          s.ringIdx = (s.ringIdx + 1) % MAX_POINTS;
          s.ringCount++;

          drawLine(cw, ch);
        };
      } catch (err) {
        console.warn("Microphone access failed:", err);
        setMicDenied(true);
      }
    };

    setTimeout(() => initMic(), 20);

    return () => {
      s.stopped = true;
      renderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  return (
    <div className="absolute inset-0 w-full h-full rounded-[inherit]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-[inherit]" />
      {micDenied && isRecording && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-background/60 backdrop-blur-sm border border-border/30">
            <MicOff className="w-7 h-7 text-destructive/60" />
            <span className="text-sm font-medium text-foreground/80">Microphone blocked</span>
            <p className="text-xs text-muted-foreground text-center max-w-[220px] leading-relaxed">
              Click the <span className="inline-flex items-center gap-0.5 font-medium text-foreground/70">🔒 lock icon</span> in your browser's address bar, then allow microphone access.
            </p>
            <button
              type="button"
              onClick={() => {
                setMicDenied(false);
                navigator.mediaDevices.getUserMedia({ audio: true })
                  .then((stream) => { stream.getTracks().forEach(t => t.stop()); window.location.reload(); })
                  .catch(() => setMicDenied(true));
              }}
              className="mt-1 text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * Main wrapper — Fix 3: single master RAF loop + Fix 4: ResizeObserver
 * ═══════════════════════════════════════════════════════════════ */
export default function PronunciationVisualizer({
  isRecording,
  isPlayingModel,
  activeWordIndex: _activeWordIndex,
  prosodyData,
  targetProgress,
  sentenceKey,
  onAutoStop,
  onPitchContour,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimsRef = useRef({ w: 0, h: 0 });
  const targetRenderRef = useRef<(() => void) | null>(null);
  const liveRenderRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number>(0);

  // Fix 4: ResizeObserver — cache dimensions, no per-frame getBoundingClientRect
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      dimsRef.current = { w: width, h: height };
    });
    ro.observe(el);
    // Initial measurement
    const rect = el.getBoundingClientRect();
    dimsRef.current = { w: rect.width, h: rect.height };
    return () => ro.disconnect();
  }, []);

  // Fix 3: Single master RAF loop driving both canvases
  useEffect(() => {
    let running = true;
    const masterLoop = () => {
      if (!running) return;
      targetRenderRef.current?.();
      liveRenderRef.current?.();
      rafRef.current = requestAnimationFrame(masterLoop);
    };
    rafRef.current = requestAnimationFrame(masterLoop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-[inherit]">
      <div className="absolute inset-0">
        <TargetContourCanvas
          data={prosodyData}
          targetProgress={targetProgress}
          isPlaying={isPlayingModel}
          renderRef={targetRenderRef}
          dims={dimsRef}
        />
      </div>
      <div className="absolute inset-0">
        <LiveInputCanvas
          isRecording={isRecording}
          prosodyData={prosodyData}
          sentenceKey={sentenceKey}
          onAutoStop={onAutoStop}
          onPitchContour={onPitchContour}
          renderRef={liveRenderRef}
          dims={dimsRef}
        />
      </div>
    </div>
  );
}
