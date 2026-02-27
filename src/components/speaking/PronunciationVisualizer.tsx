/**
 * PronunciationVisualizer — Original dual-canvas architecture.
 *
 * TargetContourVisualizer (cyan): static prosody contour drawn once from syllable data.
 * LiveInputVisualizer (green): mic RMS amplitude with smoothing, mismatch detection,
 *   auto-stop after 2s silence, and simulated fallback if mic denied.
 */
import { useRef, useEffect } from "react";
import type { WordData } from "@/lib/prosody";

/* ── Props ── */
interface Props {
  isRecording: boolean;
  isPlayingModel: boolean;
  activeWordIndex: number;
  prosodyData: WordData[];
  onAutoStop?: () => void;
  onPitchContour?: (contour: number[]) => void;
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

      // Midline
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Build points
      const points = allSyllables.map((s, i) => ({
        x: i * segW,
        y: s.pitch === 2 ? h * 0.2 : s.pitch === -1 ? h * 0.8 : h * 0.7,
      }));

      if (points.length === 0) return;

      // Draw contour
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#22d3ee");
      grad.addColorStop(1, "#3b82f6");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Progress dot
      if (isPlaying) {
        ctx.beginPath();
        ctx.arc(prog * w, h / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
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
      // Emit contour on stop
      if (onPitchContourRef.current && ampHistory.current.length > 0) {
        onPitchContourRef.current([...ampHistory.current]);
      }
      // Clean up mic
      if (audioRef.current.stream) {
        audioRef.current.stream.getTracks().forEach((t) => t.stop());
      }
      if (audioRef.current.ctx) {
        audioRef.current.ctx.close().catch(() => {});
      }
      audioRef.current = {};
      return;
    }

    // Starting new recording
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

    const drawLine = (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, w, h);

      // Midline
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Lead-in
      if (history.current.length > 0 && history.current[0].x > 0) {
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(history.current[0].x, history.current[0].y);
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw history
      for (let i = 1; i < history.current.length; i++) {
        const a = history.current[i - 1];
        const b = history.current[i];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.quadraticCurveTo(a.x, a.y, mx, my);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = b.mismatch ? "#f87171" : "#a3e635";
        ctx.shadowColor = b.mismatch ? "#f87171" : "#a3e635";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.shadowBlur = 8;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
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

          // Y position from amplitude
          let y = h / 2 - amp * h * 0.7;
          if (history.current.length > 0) {
            y = history.current[history.current.length - 1].y * 0.4 + y * 0.6;
          }
          y = Math.max(10, Math.min(h - 10, y));

          // X position
          const x = ((Date.now() - startRef.current) / maxDur) * w;

          // Mismatch detection
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
        // Mic denied — run simulation fallback
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
