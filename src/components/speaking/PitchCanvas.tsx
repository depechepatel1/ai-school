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

/* ── helpers ── */

/** Auto-scale an array of 0-1 values to use full canvas height */
function autoScale(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length < 2) return pts;
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const range = maxY - minY;
  if (range < 1) return pts; // already flat, nothing to scale
  // Scale so min→10% from bottom, max→10% from top
  return pts.map(p => ({ x: p.x, y: p.y })); // pass through – we scale in mapY instead
}

function drawSmooth(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const cx = (pts[i].x + pts[i + 1].x) / 2;
      const cy = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, cx, cy);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }
  ctx.stroke();
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
  const rafRef = useRef<number>(0);

  // ── Mic refs ──
  const micRef = useRef<{
    ctx: AudioContext;
    analyser: AnalyserNode;
    stream: MediaStream;
    tracker: RealtimePitchTracker;
  } | null>(null);

  // Persisted live contour — shared renderer for recording + post-stop
  const liveContour = useRef<number[]>([]);
  const silenceStart = useRef<number | null>(null);
  const hasSpoken = useRef(false);
  const showLive = useRef(false); // true once user has recorded at least once

  // Playhead animation
  const progressRef = useRef(0);

  // Stable callback refs
  const onAutoStopRef = useRef(onAutoStop);
  const onPitchContourRef = useRef(onPitchContour);
  useEffect(() => { onAutoStopRef.current = onAutoStop; }, [onAutoStop]);
  useEffect(() => { onPitchContourRef.current = onPitchContour; }, [onPitchContour]);

  // ── Mic lifecycle ──
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const aCtx = new AudioContext();
      const analyser = aCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.7;
      aCtx.createMediaStreamSource(stream).connect(analyser);
      const tracker = new RealtimePitchTracker(analyser, aCtx.sampleRate);
      tracker.start();
      micRef.current = { ctx: aCtx, analyser, stream, tracker };
    } catch { /* mic denied */ }
  }, []);

  const stopMic = useCallback(() => {
    if (!micRef.current) return;
    const contour = micRef.current.tracker.stop();
    liveContour.current = contour; // save raw contour for rebuilt rendering
    if (onPitchContourRef.current && contour.length > 0) onPitchContourRef.current(contour);
    micRef.current.stream.getTracks().forEach(t => t.stop());
    micRef.current.ctx.close().catch(() => {});
    micRef.current = null;
  }, []);

  // Start/stop mic when recording changes
  useEffect(() => {
    if (isRecording) {
      liveContour.current = [];
      silenceStart.current = null;
      hasSpoken.current = false;
      showLive.current = true;
      startMic();
    } else {
      stopMic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // Clear live history when a new model contour arrives (new sentence)
  const prevModelLen = useRef(modelContour.length);
  useEffect(() => {
    if (modelContour.length !== prevModelLen.current) {
      if (modelContour.length === 0) {
        liveContour.current = [];
        showLive.current = false;
      }
      prevModelLen.current = modelContour.length;
    }
  }, [modelContour]);

  // ── Map pitch (0-1) to canvas Y, auto-scaled for the given data range ──
  const mapYScaled = (val: number, h: number, dataMin: number, dataMax: number) => {
    const margin = h * 0.1;
    const drawH = h - margin * 2;
    let range = dataMax - dataMin;
    if (range < 0.01) {
      // Expand around midpoint so we still see variation
      const mid = (dataMin + dataMax) / 2;
      const expand = 0.05; // minimum visible range
      return h - margin - ((val - (mid - expand)) / (expand * 2)) * drawH;
    }
    const norm = (val - dataMin) / range;
    return h - margin - norm * drawH; // 0→bottom, 1→top
  };

  // ── Shared contour renderer (used by BOTH target and live lines) ──
  const buildContourPoints = useCallback(
    (data: number[], w: number, h: number, pad: number) => {
      if (data.length < 2) return [];
      const drawW = w - pad * 2;
      let mn = Infinity, mx = -Infinity;
      for (const v of data) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
      return data.map((v, i) => ({
        x: pad + i * (drawW / Math.max(1, data.length - 1)),
        y: mapYScaled(v, h, mn, mx),
      }));
    },
    [],
  );

  // ── Build target points ──
  const buildTargetPoints = useCallback(
    (w: number, h: number, pad: number) => {
      if (modelContour.length > 0) return buildContourPoints(modelContour, w, h, pad);

      // Always fall back to synthetic prosody if no model contour
      const allSyl = prosodyData.flatMap(d => d.syllables);
      if (allSyl.length === 0) return [];
      const syntheticContour = allSyl.map((s) => {
        if (s.pitch === 2 && s.stress === 2) return 0.95;
        if (s.pitch === 2 && s.stress === 1) return 0.8;
        if (s.pitch === 2) return 0.7;
        if (s.stress === 2) return 0.78;
        if (s.stress === 1) return 0.55;
        if (s.pitch === -1) return 0.1;
        return 0.35;
      });

      return buildContourPoints(syntheticContour, w, h, pad);
    },
    [modelContour, prosodyData, buildContourPoints],
  );
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const PAD = 12;

    const render = () => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, w, h);

      // Centre guide
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const drawW = w - PAD * 2;
      const totalWords = prosodyData.length;

      // ── TARGET (cyan) ──
      const tPts = buildTargetPoints(w, h, PAD);
      if (tPts.length > 1) {
        const targetProg =
          isPlayingModel && totalWords > 0
            ? Math.min(1, (activeWordIndex + 1) / totalWords)
            : isPlayingModel ? 0.02 : 0;

        if (isPlayingModel) {
          progressRef.current += (targetProg - progressRef.current) * 0.08;
        } else {
          progressRef.current *= 0.92;
        }

        // Dim trail (always)
        ctx.save();
        ctx.strokeStyle = "rgba(34,211,238,0.15)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        drawSmooth(ctx, tPts);
        ctx.restore();

        if (progressRef.current > 0.005) {
          // Lit portion up to playhead
          const litEndX = PAD + progressRef.current * drawW;
          const clipped: { x: number; y: number }[] = [];
          for (let i = 0; i < tPts.length; i++) {
            if (tPts[i].x > litEndX && i > 0) {
              const prev = tPts[i - 1];
              const t = (litEndX - prev.x) / (tPts[i].x - prev.x);
              clipped.push({ x: litEndX, y: prev.y + t * (tPts[i].y - prev.y) });
              break;
            }
            clipped.push(tPts[i]);
          }
          const grad = ctx.createLinearGradient(0, 0, litEndX, 0);
          grad.addColorStop(0, "#22d3ee");
          grad.addColorStop(1, "#3b82f6");
          ctx.save();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 12;
          drawSmooth(ctx, clipped);
          ctx.restore();

          // Playhead dot
          const dot = clipped[clipped.length - 1];
          if (dot) {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = "#22d3ee";
            ctx.shadowColor = "#22d3ee";
            ctx.shadowBlur = 16;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        } else {
          // Full lit line when idle
          const grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0, "#22d3ee");
          grad.addColorStop(1, "#3b82f6");
          ctx.save();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 10;
          drawSmooth(ctx, tPts);
          ctx.restore();
        }
      }

      // ── LIVE (green) — keep contour updated while recording ──
      if (isRecording && micRef.current) {
        const analyser = micRef.current.analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rawAmp = Math.sqrt(sum / data.length);

        // Auto-stop silence
        if (onAutoStopRef.current) {
          if (rawAmp > 0.02) {
            hasSpoken.current = true;
            silenceStart.current = null;
          } else if (hasSpoken.current) {
            if (!silenceStart.current) silenceStart.current = Date.now();
            if (Date.now() - silenceStart.current > 1000) {
              onAutoStopRef.current();
              silenceStart.current = null;
            }
          }
        }

        // Keep raw contour current; render path is identical to target path
        liveContour.current = micRef.current.tracker.getContour();
      }

      const livePts = buildContourPoints(liveContour.current, w, h, PAD);

      if (showLive.current && livePts.length > 1) {
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "#4ade80");
        grad.addColorStop(1, "#22c55e");
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "#4ade80";
        ctx.shadowBlur = 8;
        drawSmooth(ctx, livePts);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isRecording, isPlayingModel, activeWordIndex, prosodyData, buildTargetPoints, buildContourPoints, modelContour]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
