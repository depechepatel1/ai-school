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

/** Unified pitch visualiser — draws both target (cyan) and live (green) on one canvas. */
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

  // ── Live-recording refs ──
  const micRef = useRef<{
    ctx: AudioContext;
    analyser: AnalyserNode;
    stream: MediaStream;
    tracker: RealtimePitchTracker;
  } | null>(null);
  const liveHistory = useRef<{ x: number; y: number }[]>([]);
  const liveStart = useRef(0);
  const silenceStart = useRef<number | null>(null);
  const hasSpoken = useRef(false);

  // ── Target playhead progress ──
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
    if (onPitchContourRef.current && contour.length > 0) onPitchContourRef.current(contour);
    micRef.current.stream.getTracks().forEach((t) => t.stop());
    micRef.current.ctx.close().catch(() => {});
    micRef.current = null;
  }, []);

  // Start / stop mic when recording changes
  useEffect(() => {
    if (isRecording) {
      liveHistory.current = [];
      liveStart.current = Date.now();
      silenceStart.current = null;
      hasSpoken.current = false;
      startMic();
    } else {
      stopMic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  // ── Helpers ──
  const mapY = (val: number, h: number) => h - val * h * 0.8 - h * 0.1;

  const buildTargetPoints = useCallback(
    (w: number, h: number, pad: number) => {
      const drawW = w - pad * 2;
      const useReal = modelContour.length > 0;

      if (useReal) {
        return modelContour.map((v, i) => ({
          x: pad + i * (drawW / Math.max(1, modelContour.length - 1)),
          y: mapY(v, h),
        }));
      }

      if (!useSyntheticFallback) return [];

      const allSyl = prosodyData.flatMap((d) => d.syllables);
      if (allSyl.length === 0) return [];
      return allSyl.map((s, i) => {
        let y: number;
        if (s.pitch === 2 && s.stress === 2) y = h * 0.08;
        else if (s.pitch === 2 && s.stress === 1) y = h * 0.2;
        else if (s.pitch === 2) y = h * 0.3;
        else if (s.stress === 2) y = h * 0.22;
        else if (s.stress === 1) y = h * 0.42;
        else if (s.pitch === -1) y = h * 0.9;
        else y = h * 0.65;
        return {
          x: pad + i * (drawW / Math.max(1, allSyl.length - 1)),
          y,
        };
      });
    },
    [modelContour, prosodyData, useSyntheticFallback],
  );

  // ── Main render loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    const PAD = 12;
    const drawW = w - PAD * 2;

    const totalWords = prosodyData.length;

    const render = () => {
      ctx.clearRect(0, 0, w, h);

      // ── Centre guide line ──
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // ── TARGET contour (cyan) ──
      const tPts = buildTargetPoints(w, h, PAD);
      if (tPts.length > 1) {
        // Target playhead progress
        const targetProg =
          isPlayingModel && totalWords > 0
            ? Math.min(1, (activeWordIndex + 1) / totalWords)
            : isPlayingModel
              ? 0.02
              : 0;

        if (isPlayingModel) {
          progressRef.current += (targetProg - progressRef.current) * 0.08;
        } else {
          progressRef.current *= 0.92;
        }

        // Dim trail
        ctx.beginPath();
        ctx.moveTo(tPts[0].x, tPts[0].y);
        for (let i = 1; i < tPts.length; i++) ctx.lineTo(tPts[i].x, tPts[i].y);
        ctx.strokeStyle = "rgba(34,211,238,0.15)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        if (progressRef.current > 0.005) {
          // Lit portion
          const litEndX = PAD + progressRef.current * drawW;
          ctx.beginPath();
          ctx.moveTo(tPts[0].x, tPts[0].y);
          for (let i = 1; i < tPts.length; i++) {
            if (tPts[i].x > litEndX) {
              const prev = tPts[i - 1];
              const t = (litEndX - prev.x) / (tPts[i].x - prev.x);
              ctx.lineTo(prev.x + t * (tPts[i].x - prev.x), prev.y + t * (tPts[i].y - prev.y));
              break;
            }
            ctx.lineTo(tPts[i].x, tPts[i].y);
          }
          const grad = ctx.createLinearGradient(0, 0, litEndX, 0);
          grad.addColorStop(0, "#22d3ee");
          grad.addColorStop(1, "#3b82f6");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 3;
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Playhead dot
          const dotX = litEndX;
          let dotY = tPts[tPts.length - 1].y;
          for (let i = 1; i < tPts.length; i++) {
            if (tPts[i].x >= dotX) {
              const prev = tPts[i - 1];
              const t2 = (dotX - prev.x) / (tPts[i].x - prev.x);
              dotY = prev.y + t2 * (tPts[i].y - prev.y);
              break;
            }
          }
          ctx.beginPath();
          ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#22d3ee";
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 16;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Full line when idle
          ctx.beginPath();
          ctx.moveTo(tPts[0].x, tPts[0].y);
          for (let i = 1; i < tPts.length; i++) ctx.lineTo(tPts[i].x, tPts[i].y);
          const grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0, "#22d3ee");
          grad.addColorStop(1, "#3b82f6");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = "#22d3ee";
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // ── LIVE contour (green) ──
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
        const amp = Math.min(1, rawAmp * 20);

        // Auto-stop silence detection
        if (onAutoStopRef.current) {
          if (rawAmp > 0.02) {
            hasSpoken.current = true;
            silenceStart.current = null;
          } else if (hasSpoken.current) {
            if (!silenceStart.current) silenceStart.current = Date.now();
            if (Date.now() - silenceStart.current > 1000) {
              onAutoStopRef.current();
              silenceStart.current = null;
              return; // stop loop
            }
          }
        }

        const pitchContour = micRef.current.tracker.getContour();
        const latestPitch = pitchContour.length > 0 ? pitchContour[pitchContour.length - 1] : null;

        let y: number;
        if (latestPitch !== null) {
          y = mapY(latestPitch, h);
        } else {
          y = h / 2 - amp * h * 0.45;
        }
        if (liveHistory.current.length > 0) {
          y = liveHistory.current[liveHistory.current.length - 1].y * 0.85 + y * 0.15;
        }
        y = Math.max(10, Math.min(h - 10, y));

        const totalSyl = prosodyData.flatMap((d) => d.syllables).length;
        const maxDur = Math.max(2400, totalSyl * 300);
        const x = ((Date.now() - liveStart.current) / maxDur) * w;
        liveHistory.current.push({ x, y });

        if (liveHistory.current.length > 1) {
          ctx.beginPath();
          ctx.moveTo(liveHistory.current[0].x, liveHistory.current[0].y);
          for (let i = 1; i < liveHistory.current.length; i++) {
            ctx.lineTo(liveHistory.current[i].x, liveHistory.current[i].y);
          }
          const grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0, "#4ade80");
          grad.addColorStop(1, "#22c55e");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.shadowColor = "#4ade80";
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRecording, isPlayingModel, activeWordIndex, prosodyData, buildTargetPoints]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
