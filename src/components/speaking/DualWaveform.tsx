import { useRef, useEffect, memo } from "react";
import type { WordData } from "@/lib/prosody";

interface OverlaidWaveformProps {
  prosodyData: WordData[];
  activeWordIndex: number;
  isPlayingModel: boolean;
  isRecording: boolean;
  activeStream: MediaStream | null;
  /** When available (Aliyun TTS), real model audio for waveform display. Falls back to prosody contour when null. */
  modelAudioUrl?: string | null;
  /** When available (Aliyun TTS), word-level timestamps for precise karaoke sync. */
  modelTimestamps?: { word: string; startMs: number; endMs: number }[] | null;
}

const HEIGHT = 80;
const PAD = 8;

function buildTargetContour(data: WordData[], w: number, h: number): { x: number; y: number }[] {
  if (data.length === 0) return [];
  const points: { y: number }[] = [];
  data.forEach((word, wIdx) => {
    word.syllables.forEach((syl) => {
      if (syl.stress === 2) points.push({ y: h * 0.15 });
      else if (syl.stress === 1) points.push({ y: h * 0.35 });
      else if (word.isFunc) points.push({ y: h * 0.78 });
      else points.push({ y: h * 0.60 });
    });
    if (wIdx < data.length - 1) points.push({ y: h * 0.70 });
  });
  const step = w / Math.max(1, points.length - 1);
  return points.map((p, i) => ({ x: i * step, y: p.y }));
}

function drawSmoothLine(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  strokeColor: string,
  fillColor: string,
  lineWidth: number,
  glowColor: string,
  h: number,
) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    ctx.bezierCurveTo(
      prev.x + (curr.x - prev.x) * 0.4, prev.y,
      prev.x + (curr.x - prev.x) * 0.6, curr.y,
      curr.x, curr.y,
    );
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineTo(points[points.length - 1].x, h);
  ctx.lineTo(points[0].x, h);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
}

export default memo(function OverlaidWaveform({
  prosodyData,
  activeWordIndex,
  isPlayingModel,
  isRecording,
  activeStream,
  modelAudioUrl = null,
  modelTimestamps = null,
}: OverlaidWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimsRef = useRef({ w: 0, h: HEIGHT });
  const rafRef = useRef(0);
  const modelProgressRef = useRef(0);
  const targetModelProgress = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const studentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const recordStartRef = useRef(0);
  const lastModelDurationRef = useRef(0);
  const modelStartRef = useRef(0);

  useEffect(() => {
    if (isPlayingModel) modelStartRef.current = Date.now();
    else if (modelStartRef.current > 0) {
      lastModelDurationRef.current = Date.now() - modelStartRef.current;
    }
  }, [isPlayingModel]);

  useEffect(() => {
    if (prosodyData.length === 0) { targetModelProgress.current = 0; return; }
    if (activeWordIndex === -1) {
      if (!isPlayingModel) return;
      targetModelProgress.current = 0;
      return;
    }
    const totalSyl = prosodyData.reduce((sum, w) => sum + w.syllables.length, 0) + (prosodyData.length - 1);
    let completedSyl = 0;
    for (let i = 0; i <= activeWordIndex && i < prosodyData.length; i++) {
      completedSyl += prosodyData[i].syllables.length;
      if (i < activeWordIndex) completedSyl += 1;
    }
    targetModelProgress.current = Math.min(1, completedSyl / totalSyl);
  }, [activeWordIndex, prosodyData, isPlayingModel]);

  useEffect(() => {
    if (!isPlayingModel && modelProgressRef.current > 0.1) {
      targetModelProgress.current = 1;
    }
  }, [isPlayingModel]);

  useEffect(() => {
    if (!isRecording || !activeStream) { analyserRef.current = null; return; }
    try {
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(activeStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      studentPointsRef.current = [];
      recordStartRef.current = Date.now();
    } catch (e) {
      console.warn("[Waveform] Failed to create analyser:", e);
    }
    return () => { analyserRef.current = null; };
  }, [isRecording, activeStream]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      dimsRef.current = { w: width, h: HEIGHT };
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    dimsRef.current = { w: rect.width, h: HEIGHT };
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let running = true;
    const dataArray = new Uint8Array(128);

    const render = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(render); return; }
      const { w, h } = dimsRef.current;
      if (w === 0) { rafRef.current = requestAnimationFrame(render); return; }

      const dpr = window.devicePixelRatio || 1;
      const cw = Math.round(w * dpr);
      const ch = Math.round(h * dpr);
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.setLineDash([6, 10]);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      ctx.setLineDash([]);

      const diff = targetModelProgress.current - modelProgressRef.current;
      if (Math.abs(diff) > 0.001) modelProgressRef.current += diff * 0.12;
      else modelProgressRef.current = targetModelProgress.current;

      // ── Model contour (cyan) ──
      const allPoints = buildTargetContour(prosodyData, w, h);
      if (allPoints.length > 1 && modelProgressRef.current > 0) {
        const visibleCount = Math.max(2, Math.ceil(modelProgressRef.current * allPoints.length));
        const visible = allPoints.slice(0, visibleCount);
        drawSmoothLine(ctx, visible, "rgba(34,211,238,0.7)", "rgba(34,211,238,0.08)", 3, "rgba(34,211,238,0.6)", h);
        const tip = visible[visible.length - 1];
        if (isPlayingModel && tip) {
          ctx.beginPath(); ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(34,211,238,0.9)"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 15; ctx.fill(); ctx.shadowBlur = 0;
        }
      }

      // ── Student live amplitude (green) ──
      if (isRecording && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length) / 255;
        const ampY = h * 0.85 - rms * h * 1.4;
        const clampedY = Math.max(PAD, Math.min(h - PAD, ampY));
        const elapsed = Date.now() - recordStartRef.current;
        const duration = lastModelDurationRef.current > 0 ? lastModelDurationRef.current : 5000;
        const x = Math.min(w - PAD, (elapsed / duration) * (w - PAD * 2) + PAD);
        studentPointsRef.current.push({ x, y: clampedY });
        if (studentPointsRef.current.length > 600) studentPointsRef.current = studentPointsRef.current.slice(-500);
      }

      if (studentPointsRef.current.length > 1) {
        drawSmoothLine(ctx, studentPointsRef.current, "rgba(74,222,128,0.7)", "rgba(74,222,128,0.06)", 2.5, "rgba(74,222,128,0.5)", h);
        if (isRecording) {
          const tip = studentPointsRef.current[studentPointsRef.current.length - 1];
          ctx.beginPath(); ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(74,222,128,0.9)"; ctx.shadowColor = "#4ade80"; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
        }
      }

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [prosodyData, isPlayingModel, isRecording]);

  useEffect(() => {
    studentPointsRef.current = [];
    modelProgressRef.current = 0;
    targetModelProgress.current = 0;
  }, [prosodyData]);

  return (
    <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_0_30px_-5px_rgba(34,211,238,0.2)]" style={{ height: HEIGHT }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute top-2 left-4 flex items-center gap-3 z-10 pointer-events-none">
        <span className="text-[10px] font-black uppercase text-cyan-300 tracking-[0.2em] opacity-70">Model</span>
        <span className="text-[10px] font-black uppercase text-green-300 tracking-[0.2em] opacity-70">You</span>
      </div>

      {isRecording && (
        <div className="absolute top-2 right-3 z-10 flex items-center gap-1 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] font-bold uppercase text-red-400/80 tracking-wider">Live</span>
        </div>
      )}
      {!isPlayingModel && !isRecording && studentPointsRef.current.length === 0 && modelProgressRef.current < 0.01 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] text-white/20 italic">Play model or record to see contours</span>
        </div>
      )}
    </div>
  );
});
