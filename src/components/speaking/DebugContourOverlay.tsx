import { useRef, useEffect } from "react";
import type { WordData } from "@/lib/prosody";
import { generateTargetContour, resampleContour, zNormalize } from "@/lib/contour-match";

interface Props {
  userContour: number[];
  prosodyData: WordData[];
}

export default function DebugContourOverlay({ userContour, prosodyData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || userContour.length === 0) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    const pad = 16;
    const drawW = w - pad * 2;
    const drawH = h - pad * 2 - 20;

    const targetRaw = generateTargetContour(prosodyData);
    const len = 50;
    const tResampled = resampleContour(targetRaw, len);
    const uResampled = resampleContour(userContour, len);
    const tNorm = zNormalize(tResampled);
    const uNorm = zNormalize(uResampled);

    const all = [...tNorm, ...uNorm];
    const minV = Math.min(...all, -2);
    const maxV = Math.max(...all, 2);
    const range = maxV - minV || 1;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = pad + 10 + (drawH * i) / 4;
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(w - pad, gy); ctx.stroke();
    }

    const zeroY = pad + 10 + ((0 - minV) / range) * drawH;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad, h - zeroY + pad); ctx.lineTo(w - pad, h - zeroY + pad); ctx.stroke();
    ctx.setLineDash([]);

    const drawLine = (data: number[], color: string, label: string, labelX: number) => {
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = pad + (i / (data.length - 1)) * drawW;
        const y = pad + 10 + (1 - (data[i] - minV) / range) * drawH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
      ctx.fillStyle = color; ctx.font = "bold 10px system-ui"; ctx.fillText(label, labelX, h - 4);
    };

    drawLine(tNorm, "#22d3ee", "Target (z-norm)", pad);
    drawLine(uNorm, "#4ade80", "User (z-norm)", w / 2);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "bold 9px system-ui";
    ctx.fillText("DEBUG: Normalized Contour Overlay", pad, 12);
  }, [userContour, prosodyData]);

  if (userContour.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-1">
      <canvas ref={canvasRef} className="w-full h-32 rounded-xl" />
    </div>
  );
}
