import { useRef, useEffect } from "react";
import type { WordData } from "@/lib/prosody";
import { RealtimePitchTracker } from "@/lib/pitch-detector";

interface Props {
  isRecording: boolean;
  prosodyData: WordData[];
  onAutoStop?: () => void;
  onPitchContour?: (contour: number[]) => void;
}

export default function LiveInputCanvas({ isRecording, prosodyData, onAutoStop, onPitchContour }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<any>({});
  const history = useRef<any[]>([]);
  const startRef = useRef(0);
  const silenceStartRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const onAutoStopRef = useRef(onAutoStop);
  const onPitchContourRef = useRef(onPitchContour);
  const pitchTrackerRef = useRef<RealtimePitchTracker | null>(null);

  useEffect(() => { onAutoStopRef.current = onAutoStop; }, [onAutoStop]);
  useEffect(() => { onPitchContourRef.current = onPitchContour; }, [onPitchContour]);

  useEffect(() => {
    if (!isRecording) {
      if (audioRef.current.req) cancelAnimationFrame(audioRef.current.req);
      if (pitchTrackerRef.current) {
        const contour = pitchTrackerRef.current.stop();
        if (onPitchContourRef.current && contour.length > 0) onPitchContourRef.current(contour);
        pitchTrackerRef.current = null;
      }
      return;
    }
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
    history.current = [];
    silenceStartRef.current = null;
    hasSpokenRef.current = false;
    startRef.current = Date.now();

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const aCtx = new AudioContext();
        const analyser = aCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.7;
        const src = aCtx.createMediaStreamSource(stream);
        src.connect(analyser);
        audioRef.current = { ctx: aCtx, analyser, src, req: null, stream };
        pitchTrackerRef.current = new RealtimePitchTracker(analyser, aCtx.sampleRate);
        pitchTrackerRef.current.start();
        draw(ctx, w, h);
      } catch { /* no mic */ }
    };

    const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!audioRef.current.analyser) return;
      const data = new Uint8Array(audioRef.current.analyser.frequencyBinCount);
      audioRef.current.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      const rawAmp = Math.sqrt(sum / data.length);
      const amp = Math.min(1, rawAmp * 20);

      if (onAutoStopRef.current) {
        if (rawAmp > 0.02) {
          hasSpokenRef.current = true;
          silenceStartRef.current = null;
        } else if (hasSpokenRef.current) {
          if (!silenceStartRef.current) silenceStartRef.current = Date.now();
          if (Date.now() - silenceStartRef.current > 1000) { onAutoStopRef.current(); silenceStartRef.current = null; return; }
        }
      }

      const tracker = pitchTrackerRef.current;
      const pitchContour = tracker?.getContour() ?? [];
      const latestPitch = pitchContour.length > 0 ? pitchContour[pitchContour.length - 1] : null;

      let y: number;
      if (latestPitch !== null) { y = h - latestPitch * h * 0.8 - h * 0.1; }
      else { y = h / 2 - amp * h * 0.45; }
      if (history.current.length > 0) y = history.current[history.current.length - 1].y * 0.85 + y * 0.15;
      y = Math.max(10, Math.min(h - 10, y));

      const totalSyl = prosodyData.flatMap((d) => d.syllables).length;
      const maxDur = Math.max(2400, totalSyl * 300);
      const x = ((Date.now() - startRef.current) / maxDur) * w;
      history.current.push({ x, y });

      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

      if (history.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(history.current[0].x, history.current[0].y);
        for (let i = 1; i < history.current.length; i++) ctx.lineTo(history.current[i].x, history.current[i].y);
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "#4ade80"); grad.addColorStop(1, "#22c55e");
        ctx.strokeStyle = grad; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.shadowColor = "#4ade80"; ctx.shadowBlur = 8; ctx.stroke();
      }

      audioRef.current.req = requestAnimationFrame(() => draw(ctx, w, h));
    };

    initMic();

    return () => {
      if (audioRef.current.req) cancelAnimationFrame(audioRef.current.req);
      if (audioRef.current.stream) audioRef.current.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      if (audioRef.current.ctx) audioRef.current.ctx.close().catch(() => {});
    };
  }, [isRecording, prosodyData]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
