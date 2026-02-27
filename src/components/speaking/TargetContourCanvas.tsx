import { useRef, useEffect } from "react";
import type { WordData } from "@/lib/prosody";

interface Props {
  data: WordData[];
  isPlaying: boolean;
  activeWordIndex: number;
  contour?: number[];
}

export default function TargetContourCanvas({ data, isPlaying, activeWordIndex, contour }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef(0);

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
    const pad = 12;
    const drawW = w - pad * 2;

    const useRealContour = contour && contour.length > 0;

    // Build points from real contour data
    const getRealPoints = () =>
      contour!.map((val, i) => ({
        x: pad + i * (drawW / Math.max(1, contour!.length - 1)),
        y: h - val * h * 0.8 - h * 0.1,
      }));

    // Build points from synthetic prosody data
    const allSyllables = data.flatMap((d) => d.syllables);
    const getSyntheticPoints = () =>
      allSyllables.map((s, i) => {
        let y: number;
        if (s.pitch === 2 && s.stress === 2) y = h * 0.08;
        else if (s.pitch === 2 && s.stress === 1) y = h * 0.2;
        else if (s.pitch === 2) y = h * 0.3;
        else if (s.stress === 2) y = h * 0.22;
        else if (s.stress === 1) y = h * 0.42;
        else if (s.pitch === -1) y = h * 0.9;
        else y = h * 0.65;
        return { x: pad + i * (drawW / Math.max(1, allSyllables.length - 1)), y };
      });

    const totalWords = data.length;
    const targetProgress =
      isPlaying && totalWords > 0
        ? Math.min(1, (activeWordIndex + 1) / totalWords)
        : isPlaying
          ? 0.02
          : 0;

    const draw = () => {
      if (isPlaying) {
        progressRef.current += (targetProgress - progressRef.current) * 0.08;
      } else {
        progressRef.current *= 0.92;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const points = useRealContour ? getRealPoints() : getSyntheticPoints();
      if (points.length === 0) return;

      // Dim trail
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = "rgba(34,211,238,0.15)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      if (progressRef.current > 0.005) {
        const litEndX = pad + progressRef.current * drawW;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          if (points[i].x > litEndX) {
            const prev = points[i - 1];
            const t = (litEndX - prev.x) / (points[i].x - prev.x);
            ctx.lineTo(prev.x + t * (points[i].x - prev.x), prev.y + t * (points[i].y - prev.y));
            break;
          }
          ctx.lineTo(points[i].x, points[i].y);
        }
        const grad = ctx.createLinearGradient(0, 0, litEndX, 0);
        grad.addColorStop(0, "#22d3ee");
        grad.addColorStop(1, "#3b82f6");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Playhead dot
        const dotX = litEndX;
        const dotY = (() => {
          for (let i = 1; i < points.length; i++) {
            if (points[i].x >= dotX) {
              const prev = points[i - 1];
              const t = (dotX - prev.x) / (points[i].x - prev.x);
              return prev.y + t * (points[i].y - prev.y);
            }
          }
          return points[points.length - 1].y;
        })();
        ctx.beginPath();
        ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#22d3ee";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
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

      if (isPlaying || progressRef.current > 0.01) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    if (isPlaying) {
      animRef.current = requestAnimationFrame(draw);
    } else {
      draw();
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [data, isPlaying, activeWordIndex, contour]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
