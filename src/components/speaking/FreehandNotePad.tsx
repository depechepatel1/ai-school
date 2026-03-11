import { useState, useRef, useEffect } from "react";
import { Edit, Keyboard, PenTool, Trash } from "lucide-react";

export default function FreehandNotePad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"draw" | "type">("type");
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    if (mode === "draw" && wrapperRef.current && canvasRef.current) {
      canvasRef.current.width = wrapperRef.current.clientWidth;
      canvasRef.current.height = wrapperRef.current.clientHeight;
    }
  }, [mode]);

  const startDrawing = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath(); ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "white";
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const clearCanvas = () => {
    if (mode === "draw" && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    } else { setTypedText(""); }
  };

  return (
    <div className="absolute top-[150px] right-3 sm:right-5 w-[220px] sm:w-[280px] h-[180px] sm:h-[220px] bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-2xl flex flex-col z-[200] animate-fade-in overflow-hidden">
      <div className="p-2 sm:p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <Edit className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Notes</span>
        </div>
        <div className="flex gap-1.5 sm:gap-2 items-center">
          <button onClick={() => setMode("type")} className={`p-1.5 rounded transition-colors ${mode === "type" ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/60"}`}><Keyboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
          <button onClick={() => setMode("draw")} className={`p-1.5 rounded transition-colors ${mode === "draw" ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/60"}`}><PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
          <button onClick={clearCanvas} className="p-1.5 hover:bg-white/10 rounded text-white/60"><Trash className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
        </div>
      </div>
      <div ref={wrapperRef} className="flex-1 relative bg-white/5 overflow-hidden">
        {mode === "draw" ? (
          <canvas ref={canvasRef} className="w-full h-full touch-none cursor-crosshair" style={{ touchAction: "none" }}
            onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={() => setIsDrawing(false)} onPointerLeave={() => setIsDrawing(false)} />
        ) : (
          <textarea value={typedText} onChange={(e) => setTypedText(e.target.value)}
            className="w-full h-full bg-transparent p-3 sm:p-4 text-white font-mono text-xs sm:text-sm resize-none focus:outline-none placeholder-white/20" placeholder="Type your notes here..." />
        )}
      </div>
    </div>
  );
}
