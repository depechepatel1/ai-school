/**
 * PronunciationVisualizer — dual-canvas: target contour + live user line.
 * Target advances via targetProgress prop (0→1) driven by TTS boundary events.
 * User line uses adaptive normalization with dual-feature Y mapping.
 */
import { useRef, useEffect, useCallback } from "react";
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

function setupCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number; resized: boolean } {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);
  const resized = canvas.width !== targetW || canvas.height !== targetH;
  if (resized) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext("2d")!;
  if (resized) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return { ctx, w: rect.width, h: rect.height, resized };
}

/* ═══════════════════════════════════════════════════════════════
 * TargetContourCanvas — boundary-driven progressive reveal
 * ═══════════════════════════════════════════════════════════════ */
function TargetContourCanvas({
  data,
  targetProgress,
  isPlaying,
}: {
  data: WordData[];
  targetProgress: number;
  isPlaying: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animProgressRef = useRef(0);
  const rafRef = useRef<number>(0);
  const targetProgressRef = useRef(targetProgress);
  const isPlayingRef = useRef(isPlaying);

  // Keep refs in sync without triggering re-renders / effect re-runs
  useEffect(() => { targetProgressRef.current = targetProgress; }, [targetProgress]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setupCanvas(canvas); // initial sizing
    const ctx = canvas.getContext("2d")!;

    const allSyllables = data.flatMap((d) => d.syllables);

    const getGeometry = () => {
      const rect = canvas.getBoundingClientRect();
      return { w: rect.width, h: rect.height };
    };

    const computePoints = (w: number, h: number) => {
      if (allSyllables.length === 0) return [];
      const segW = w / Math.max(1, allSyllables.length - 1);
      return allSyllables.map((s, i) => ({
        x: i * segW,
        y: s.pitch === 2 ? (s.stress === 2 ? h * 0.15 : h * 0.35) : s.pitch === -1 ? h * 0.80 : h * 0.60,
      }));
    };

    const draw = (prog: number, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      drawVignette(ctx, w, h);
      drawGridLines(ctx, w, h);
      drawDashedMidline(ctx, w, h);

      const points = computePoints(w, h);
      if (points.length === 0) return;

      const visibleCount = Math.max(1, Math.ceil(prog * points.length));
      const visiblePoints = points.slice(0, visibleCount);

      // Draw contour
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

      // Fill beneath
      ctx.lineTo(visiblePoints[visiblePoints.length - 1].x, h);
      ctx.lineTo(visiblePoints[0].x, h);
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
      fillGrad.addColorStop(0, "rgba(34,211,238,0.18)");
      fillGrad.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Progress dot while playing
      if (isPlayingRef.current && prog < 1) {
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

    // Reset animated progress on new data
    animProgressRef.current = 0;

    // Persistent animation loop — reads refs, never re-created on prop change
    let running = true;
    const loop = () => {
      if (!running) return;
      setupCanvas(canvas); // handles resize without flash when unchanged
      const { w, h } = getGeometry();

      const target = targetProgressRef.current;
      const diff = target - animProgressRef.current;
      if (Math.abs(diff) > 0.001) {
        animProgressRef.current += diff * 0.15;
      } else {
        animProgressRef.current = target;
      }

      draw(animProgressRef.current, w, h);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [data]); // Only re-create on data change, NOT on progress/playing changes

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-[inherit]" />;
}

/* ═══════════════════════════════════════════════════════════════
 * LiveInputCanvas — recoded user mic line with adaptive normalization
 * ═══════════════════════════════════════════════════════════════ */

interface HistoryPt {
  x: number;
  y: number;
  mismatch: boolean;
}

function LiveInputCanvas({
  isRecording,
  prosodyData,
  sentenceKey,
  onAutoStop,
  onPitchContour,
}: {
  isRecording: boolean;
  prosodyData: WordData[];
  sentenceKey: number;
  onAutoStop?: () => void;
  onPitchContour?: (contour: number[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    ctx?: AudioContext;
    analyser?: AnalyserNode;
    stream?: MediaStream;
    req?: number;
    history: HistoryPt[];
    ampHistory: number[];
    noiseFloor: number;
    peakAmp: number;
    smoothY: number;
    phase: number;
    startTime: number;
    silenceStart: number | null;
    stopped: boolean;
  }>({
    history: [],
    ampHistory: [],
    noiseFloor: 0.01,
    peakAmp: 0.05,
    smoothY: 0,
    phase: 0,
    startTime: 0,
    silenceStart: null,
    stopped: false,
  });
  const onAutoStopRef = useRef(onAutoStop);
  const onPitchContourRef = useRef(onPitchContour);

  useEffect(() => { onAutoStopRef.current = onAutoStop; }, [onAutoStop]);
  useEffect(() => { onPitchContourRef.current = onPitchContour; }, [onPitchContour]);

  // Reset history on new sentence
  useEffect(() => {
    stateRef.current.history = [];
    stateRef.current.ampHistory = [];
    stateRef.current.noiseFloor = 0.01;
    stateRef.current.peakAmp = 0.05;
    stateRef.current.smoothY = 0;
    stateRef.current.phase = 0;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx2d = canvas.getContext("2d");
      if (ctx2d) {
        const dpr = window.devicePixelRatio || 1;
        ctx2d.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
    }
  }, [sentenceKey]);

  useEffect(() => {
    const s = stateRef.current;

    if (!isRecording) {
      s.stopped = true;
      if (s.req) cancelAnimationFrame(s.req);
      if (onPitchContourRef.current && s.ampHistory.length > 0) {
        onPitchContourRef.current([...s.ampHistory]);
      }
      if (s.stream) s.stream.getTracks().forEach((t) => t.stop());
      if (s.ctx) s.ctx.close().catch(() => {});
      s.ctx = undefined;
      s.analyser = undefined;
      s.stream = undefined;
      s.req = undefined;
      // Don't clear history — persist user line for comparison
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx: ctx2d, w, h } = setupCanvas(canvas);

    // Reset for new recording
    s.history = [];
    s.ampHistory = [];
    s.noiseFloor = 0.01;
    s.peakAmp = 0.05;
    s.smoothY = h / 2;
    s.phase = 0;
    s.stopped = false;
    s.silenceStart = Date.now();
    ctx2d.clearRect(0, 0, w, h);

    const allSyl = prosodyData.flatMap((d) => d.syllables);
    const totalSyl = allSyl.length;
    const maxDur = Math.max(3000, totalSyl * 350);
    const PAD = 8; // edge padding
    const TRAIL = 80;

    const drawLine = () => {
      ctx2d.clearRect(0, 0, w, h);
      // Background decorations are drawn only by TargetContourCanvas (bottom layer)

      const pts = s.history;
      if (pts.length < 2) return;

      const headIdx = pts.length - 1;

      // Draw segments with trailing fade
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const distFromHead = headIdx - i;
        const opacity = Math.max(0.15, 1 - distFromHead / TRAIL);
        ctx2d.globalAlpha = opacity;
        const color = b.mismatch ? "#f87171" : "#a3e635";
        ctx2d.beginPath();
        ctx2d.moveTo(a.x, a.y);
        const cpx1 = a.x + (b.x - a.x) * 0.4;
        const cpx2 = a.x + (b.x - a.x) * 0.6;
        ctx2d.bezierCurveTo(cpx1, a.y, cpx2, b.y, b.x, b.y);
        ctx2d.strokeStyle = color;
        ctx2d.shadowColor = color;
        ctx2d.lineWidth = 4;
        ctx2d.lineCap = "round";
        ctx2d.shadowBlur = b.mismatch ? 24 : 16;
        ctx2d.stroke();
      }
      ctx2d.globalAlpha = 1;
      ctx2d.shadowBlur = 0;

      // Fill beneath
      ctx2d.beginPath();
      ctx2d.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        ctx2d.bezierCurveTo(
          a.x + (b.x - a.x) * 0.4, a.y,
          a.x + (b.x - a.x) * 0.6, b.y,
          b.x, b.y,
        );
      }
      ctx2d.lineTo(pts[pts.length - 1].x, h);
      ctx2d.lineTo(pts[0].x, h);
      ctx2d.closePath();
      const fillGrad = ctx2d.createLinearGradient(0, 0, 0, h);
      fillGrad.addColorStop(0, "rgba(163,230,53,0.15)");
      fillGrad.addColorStop(1, "rgba(163,230,53,0)");
      ctx2d.fillStyle = fillGrad;
      ctx2d.fill();

      // Head dot
      const head = pts[headIdx];
      const radius = 5 + Math.sin(Date.now() * 0.008) * 2;
      const headColor = head.mismatch ? "#f87171" : "#a3e635";
      ctx2d.beginPath();
      ctx2d.arc(head.x, head.y, radius + 3, 0, Math.PI * 2);
      ctx2d.fillStyle = head.mismatch ? "rgba(248,113,113,0.15)" : "rgba(163,230,53,0.15)";
      ctx2d.fill();
      ctx2d.beginPath();
      ctx2d.arc(head.x, head.y, radius, 0, Math.PI * 2);
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

        const loop = () => {
          if (s.stopped || !s.analyser) return;

          s.analyser.getByteTimeDomainData(timeBuf);
          s.analyser.getByteFrequencyData(freqBuf);

          // RMS energy
          let sum = 0;
          for (let i = 0; i < timeBuf.length; i++) {
            const v = (timeBuf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / timeBuf.length);

          // Adaptive noise floor (slow rise, fast drop)
          if (rms < s.noiseFloor * 1.5) {
            s.noiseFloor = s.noiseFloor * 0.995 + rms * 0.005;
          }
          // Adaptive peak (fast rise, slow decay)
          if (rms > s.peakAmp) {
            s.peakAmp = s.peakAmp * 0.7 + rms * 0.3;
          } else {
            s.peakAmp = s.peakAmp * 0.95 + rms * 0.05;
          }
          s.peakAmp = Math.max(s.peakAmp, s.noiseFloor * 3, 0.02);

          // Normalize amplitude to 0-1 range
          let normAmp = Math.min(1, Math.max(0, (rms - s.noiseFloor) / (s.peakAmp - s.noiseFloor)));
          // Floor: ensure quiet speech still produces visible oscillation
          if (rms > s.noiseFloor * 1.5 && normAmp < 0.12) normAmp = 0.12;

          // Spectral centroid for frequency feature
          let weightedSum = 0, magSum = 0;
          for (let fi = 0; fi < freqBuf.length; fi++) {
            weightedSum += fi * freqBuf[fi];
            magSum += freqBuf[fi];
          }
          const centroid = magSum > 0 ? (weightedSum / magSum) / freqBuf.length : 0.5;

          s.ampHistory.push(normAmp);

          // Auto-stop: 1s silence
          if (onAutoStopRef.current) {
            if (rms > s.noiseFloor * 2.5) {
              s.silenceStart = Date.now();
            } else {
              if (!s.silenceStart) s.silenceStart = Date.now();
              if (Date.now() - s.silenceStart > 1000) {
                onAutoStopRef.current();
                return;
              }
            }
          }

          // Bidirectional Y mapping using energy + spectral centroid
          // Phase advances faster when amplitude is higher for natural oscillation
          s.phase += 0.12 + normAmp * 0.24;
          const direction = Math.sin(s.phase); // -1 to 1
          const drawableRange = h - PAD * 2;
          const midY = h / 2;

          // Map: amplitude controls displacement magnitude, direction controls sign
          // centroid biases toward top (high freq) or bottom (low freq)
          const centroidBias = (centroid - 0.5) * 0.375; // 25% wider bias
          const displacement = normAmp * (drawableRange * 0.75) * (direction + centroidBias);
          let targetY = midY - displacement;

          // Heavier smoothing for fluid, prosody-like curves
          targetY = s.smoothY * 0.55 + targetY * 0.45;
          targetY = Math.max(PAD, Math.min(h - PAD, targetY));
          s.smoothY = targetY;

          const elapsed = Date.now() - s.startTime;
          const x = (elapsed / maxDur) * w;

          // Mismatch detection
          const estIdx = Math.floor((x / w) * totalSyl);
          let mismatch = false;
          if (allSyl[estIdx]) {
            const high = allSyl[estIdx].pitch === 2;
            if (high && normAmp < 0.2) mismatch = true;
            if (!high && normAmp > 0.8) mismatch = true;
          }

          s.history.push({ x, y: targetY, mismatch });
          drawLine();
          s.req = requestAnimationFrame(loop);
        };

        loop();
      } catch {
        // Simulation fallback
        s.startTime = Date.now();
        const simLoop = () => {
          if (s.stopped) return;
          const elapsed = Date.now() - s.startTime;
          if (onAutoStopRef.current && elapsed > 5000) {
            onAutoStopRef.current();
            return;
          }
          const x = (elapsed / maxDur) * w;
          s.phase += 0.1;
          const amp = 0.3 + Math.sin(elapsed * 0.003) * 0.3;
          const direction = Math.sin(s.phase);
          let y = h / 2 - amp * (h - PAD * 2) * 0.45 * direction;
          y = s.smoothY * 0.4 + y * 0.6;
          y = Math.max(PAD, Math.min(h - PAD, y));
          s.smoothY = y;
          s.history.push({ x, y, mismatch: Math.random() > 0.85 });
          drawLine();
          s.req = requestAnimationFrame(simLoop);
        };
        simLoop();
      }
    };

    setTimeout(() => initMic(), 20);

    return () => {
      s.stopped = true;
      if (s.req) cancelAnimationFrame(s.req);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-[inherit]" />;
}

/* ═══════════════════════════════════════════════════════════════
 * Main wrapper — two canvases stacked
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
  return (
    <div className="relative w-full h-full overflow-hidden rounded-[inherit]">
      <div className="absolute inset-0">
        <TargetContourCanvas data={prosodyData} targetProgress={targetProgress} isPlaying={isPlayingModel} />
      </div>
      <div className="absolute inset-0">
        <LiveInputCanvas
          isRecording={isRecording}
          prosodyData={prosodyData}
          sentenceKey={sentenceKey}
          onAutoStop={onAutoStop}
          onPitchContour={onPitchContour}
        />
      </div>
    </div>
  );
}
