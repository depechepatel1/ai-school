/**
 * PronunciationVisualizer — Enhanced dual-canvas architecture.
 */
import { useRef, useEffect } from "react";
import type { WordData } from "@/lib/prosody";

interface Props {
  isRecording: boolean;
  isPlayingModel: boolean;
  activeWordIndex: number;
  prosodyData: WordData[];
  onAutoStop?: () => void;
  onPitchContour?: (contour: number[]) => void;
}

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

/* ═══════════════════════════════════════════════════════════════
 * TargetContourVisualizer — static prosody line + progress dot
 * ═══════════════════════════════════════════════════════════════ */
function TargetContourCanvas({
  data,
  isPlaying,
}: {
  data: WordData[];
  isPlaying: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const allSyllables = data.flatMap((d) => d.syllables);
    const segW = w / Math.max(1, allSyllables.length - 1);

    const draw = (prog = 0) => {
      ctx.clearRect(0, 0, w, h);

      // Vignette background
      drawVignette(ctx, w, h);

      // Grid lines + dashed midline
      drawGridLines(ctx, w, h);
      drawDashedMidline(ctx, w, h);

      // Build points
      const points = allSyllables.map((s, i) => ({
        x: i * segW,
        y: s.pitch === 2 ? h * 0.2 : s.pitch === -1 ? h * 0.8 : h * 0.7,
      }));

      if (points.length === 0) return;

      // Draw contour path using cubic bezier
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
        const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
        ctx.bezierCurveTo(cpx1, prev.y, cpx2, curr.y, curr.x, curr.y);
      }

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#22d3ee");
      grad.addColorStop(1, "#3b82f6");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Gradient fill beneath contour
      ctx.lineTo(points[points.length - 1].x, h);
      ctx.lineTo(points[0].x, h);
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
      fillGrad.addColorStop(0, "rgba(34,211,238,0.18)");
      fillGrad.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Progress dot with pulse
      if (isPlaying) {
        const dotX = prog * w;
        const baseRadius = 5 + Math.sin(Date.now() * 0.008) * 2;

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(dotX, h / 2, baseRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fill();

        // Inner dot
        ctx.beginPath();
        ctx.arc(dotX, h / 2, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    let id: number;
    if (isPlaying) {
      const start = Date.now();
      const totalDur = allSyllables.length * 300;
      const loop = () => {
        draw(Math.min((Date.now() - start) / totalDur, 1));
        id = requestAnimationFrame(loop);
      };
      loop();
    } else {
      draw(0);
    }

    return () => cancelAnimationFrame(id);
  }, [data, isPlaying]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

/* ═══════════════════════════════════════════════════════════════
 * LiveInputVisualizer — mic RMS amplitude line
 * ═══════════════════════════════════════════════════════════════ */

interface HistoryPt {
  x: number;
  y: number;
  mismatch: boolean;
}

function LiveInputCanvas({
  isRecording,
  prosodyData,
  onAutoStop,
  onPitchContour,
}: {
  isRecording: boolean;
  prosodyData: WordData[];
  onAutoStop?: () => void;
  onPitchContour?: (contour: number[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<{
    ctx?: AudioContext;
    analyser?: AnalyserNode;
    src?: MediaStreamAudioSourceNode;
    stream?: MediaStream;
    req?: number;
  }>({});
  const history = useRef<HistoryPt[]>([]);
  const startRef = useRef(0);
  const silenceStartRef = useRef<number | null>(null);
  const onAutoStopRef = useRef(onAutoStop);
  const onPitchContourRef = useRef(onPitchContour);
  const ampHistory = useRef<number[]>([]);

  useEffect(() => { onAutoStopRef.current = onAutoStop; }, [onAutoStop]);
  useEffect(() => { onPitchContourRef.current = onPitchContour; }, [onPitchContour]);

  useEffect(() => {
    if (!isRecording) {
      if (audioRef.current.req) cancelAnimationFrame(audioRef.current.req);
      if (onPitchContourRef.current && ampHistory.current.length > 0) {
        onPitchContourRef.current([...ampHistory.current]);
      }
      if (audioRef.current.stream) {
        audioRef.current.stream.getTracks().forEach((t) => t.stop());
      }
      if (audioRef.current.ctx) {
        audioRef.current.ctx.close().catch(() => {});
      }
      audioRef.current = {};
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx2d.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    history.current = [];
    ampHistory.current = [];
    ctx2d.clearRect(0, 0, w, h);
    silenceStartRef.current = Date.now();

    const allSyl = prosodyData.flatMap((d) => d.syllables);
    const totalSyl = allSyl.length;
    const maxDur = Math.max(2400, totalSyl * 300);
    const TRAIL_LENGTH = 60;

    const drawLine = (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, w, h);

      // Vignette + dashed midline
      drawVignette(ctx, w, h);
      drawDashedMidline(ctx, w, h);

      // Lead-in
      if (history.current.length > 0 && history.current[0].x > 0) {
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(history.current[0].x, history.current[0].y);
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const headIdx = history.current.length - 1;

      // Draw history with trailing fade
      for (let i = 1; i < history.current.length; i++) {
        const a = history.current[i - 1];
        const b = history.current[i];

        // Trailing fade
        const distFromHead = headIdx - i;
        const opacity = Math.max(0.15, 1 - distFromHead / TRAIL_LENGTH);
        ctx.globalAlpha = opacity;

        const isMismatch = b.mismatch;
        const color = isMismatch ? "#f87171" : "#a3e635";

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const cpx1 = a.x + (b.x - a.x) * 0.4;
        const cpx2 = a.x + (b.x - a.x) * 0.6;
        ctx.bezierCurveTo(cpx1, a.y, cpx2, b.y, b.x, b.y);
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.shadowBlur = isMismatch ? 24 : 16;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Gradient fill beneath live line
      if (history.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(history.current[0].x, history.current[0].y);
        for (let i = 1; i < history.current.length; i++) {
          const a = history.current[i - 1];
          const b = history.current[i];
          const cpx1 = a.x + (b.x - a.x) * 0.4;
          const cpx2 = a.x + (b.x - a.x) * 0.6;
          ctx.bezierCurveTo(cpx1, a.y, cpx2, b.y, b.x, b.y);
        }
        ctx.lineTo(history.current[history.current.length - 1].x, h);
        ctx.lineTo(history.current[0].x, h);
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
        fillGrad.addColorStop(0, "rgba(163,230,53,0.15)");
        fillGrad.addColorStop(1, "rgba(163,230,53,0)");
        ctx.fillStyle = fillGrad;
        ctx.fill();
      }

      // Pulsing head dot
      if (history.current.length > 0) {
        const head = history.current[headIdx];
        const radius = 5 + Math.sin(Date.now() * 0.008) * 2;
        const headColor = head.mismatch ? "#f87171" : "#a3e635";

        ctx.beginPath();
        ctx.arc(head.x, head.y, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = head.mismatch ? "rgba(248,113,113,0.15)" : "rgba(163,230,53,0.15)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(head.x, head.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = headColor;
        ctx.shadowColor = headColor;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const aCtx = new AudioContext();
        const analyser = aCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.3;
        const src = aCtx.createMediaStreamSource(stream);
        src.connect(analyser);
        audioRef.current = { ctx: aCtx, analyser, src, stream, req: undefined };

        const draw = () => {
          if (!audioRef.current.analyser) return;

          const data = new Uint8Array(audioRef.current.analyser.frequencyBinCount);
          audioRef.current.analyser.getByteTimeDomainData(data);

          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rawAmp = Math.sqrt(sum / data.length);
          const amp = Math.min(1, rawAmp * 80);
          ampHistory.current.push(amp);

          // Auto-stop: 1s silence
          if (onAutoStopRef.current) {
            if (rawAmp > 0.02) {
              silenceStartRef.current = Date.now();
            } else {
              if (!silenceStartRef.current) silenceStartRef.current = Date.now();
              if (Date.now() - silenceStartRef.current > 1000) {
                onAutoStopRef.current();
                silenceStartRef.current = null;
                return;
              }
            }
          }

          let y = h / 2 - amp * h * 0.7;
          if (history.current.length > 0) {
            y = history.current[history.current.length - 1].y * 0.4 + y * 0.6;
          }
          y = Math.max(10, Math.min(h - 10, y));

          const x = ((Date.now() - startRef.current) / maxDur) * w;

          const estIdx = Math.floor((x / w) * totalSyl);
          let mismatch = false;
          if (allSyl[estIdx]) {
            const high = allSyl[estIdx].pitch === 2;
            if (high && amp < 0.2) mismatch = true;
            if (!high && amp > 0.6) mismatch = true;
          }

          history.current.push({ x, y, mismatch });
          drawLine(ctx2d);

          audioRef.current.req = requestAnimationFrame(draw);
        };

        draw();
      } catch {
        simulate(ctx2d, w, h, maxDur);
      }
    };

    const simulate = (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      maxDur: number,
    ) => {
      const simLoop = () => {
        const elapsed = Date.now() - startRef.current;
        if (onAutoStopRef.current && elapsed > 5000) {
          onAutoStopRef.current();
          return;
        }
        const x = (elapsed / maxDur) * w;
        let y = h / 2 - Math.sin(elapsed * 0.01) * Math.random() * h * 0.4;
        if (history.current.length > 0) {
          y = history.current[history.current.length - 1].y * 0.9 + y * 0.1;
        }
        history.current.push({ x, y, mismatch: Math.random() > 0.85 });
        drawLine(ctx);
        audioRef.current.req = requestAnimationFrame(simLoop);
      };
      simLoop();
    };

    setTimeout(() => {
      startRef.current = Date.now();
      initMic();
    }, 20);

    return () => {
      if (audioRef.current.req) cancelAnimationFrame(audioRef.current.req);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

/* ═══════════════════════════════════════════════════════════════
 * Main wrapper — two canvases stacked
 * ═══════════════════════════════════════════════════════════════ */
export default function PronunciationVisualizer({
  isRecording,
  isPlayingModel,
  activeWordIndex: _activeWordIndex,
  prosodyData,
  onAutoStop,
  onPitchContour,
}: Props) {
  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0">
        <TargetContourCanvas data={prosodyData} isPlaying={isPlayingModel} />
      </div>
      <div className="absolute inset-0">
        <LiveInputCanvas
          isRecording={isRecording}
          prosodyData={prosodyData}
          onAutoStop={onAutoStop}
          onPitchContour={onPitchContour}
        />
      </div>
    </div>
  );
}
