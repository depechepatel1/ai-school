import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

const BAR_COUNT = 5;

type MicSize = "sm" | "md" | "lg" | "xl";
type MicShape = "rounded" | "circle";

interface MicRecordButtonProps {
  isRecording: boolean;
  micDenied?: boolean;
  onToggle: () => void;
  stream?: MediaStream | null;
  size?: MicSize;
  shape?: MicShape;
  idleClassName?: string;
  className?: string;
}

const SIZE_MAP: Record<MicSize, { btn: string; icon: string; stop: string }> = {
  sm: { btn: "w-12 h-12", icon: "w-5 h-5", stop: "w-4 h-4" },
  md: { btn: "w-14 h-14", icon: "w-6 h-6", stop: "w-5 h-5" },
  lg: { btn: "w-16 h-16", icon: "w-8 h-8", stop: "w-6 h-6" },
  xl: { btn: "w-20 h-20", icon: "w-9 h-9", stop: "w-6 h-6" },
};

const SHAPE_MAP: Record<MicShape, string> = {
  rounded: "rounded-2xl",
  circle: "rounded-full",
};

export default function MicRecordButton({
  isRecording,
  micDenied = false,
  onToggle,
  stream,
  size = "md",
  shape = "rounded",
  idleClassName = "bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]",
  className = "",
}: MicRecordButtonProps) {
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isRecording && stream) {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);

      let active = true;
      let lastUpdate = 0;
      const THROTTLE_MS = 67; // ~15fps is sufficient for level bars
      const tick = () => {
        if (!active) return;
        const now = performance.now();
        if (now - lastUpdate >= THROTTLE_MS) {
          lastUpdate = now;
          analyser.getByteFrequencyData(buf);
          const step = Math.floor(buf.length / BAR_COUNT);
          setLevels(Array.from({ length: BAR_COUNT }, (_, i) => {
            let sum = 0;
            for (let j = 0; j < step; j++) sum += buf[i * step + j];
            return Math.min(1, (sum / step) / 160);
          }));
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);

      return () => {
        active = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        ctx.close().catch(() => {});
        analyserRef.current = null;
        ctxRef.current = null;
        setLevels(Array(BAR_COUNT).fill(0));
      };
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
      setLevels(Array(BAR_COUNT).fill(0));
    }
  }, [isRecording, stream]);

  const { btn, icon, stop } = SIZE_MAP[size];
  const shapeClass = SHAPE_MAP[shape];
  const stopRound = shape === "circle" ? "rounded" : "rounded-sm";

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Status dot */}
      <div className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 border-black/30 z-10 transition-all ${
        micDenied ? "bg-red-500" : isRecording ? "bg-green-500 animate-pulse" : "bg-white/20"
      }`} />

      {/* Button */}
      <button
        onClick={onToggle}
        title={isRecording ? "Stop" : "Record"}
        className={`relative ${btn} ${shapeClass} flex items-center justify-center transition-all duration-300 ${
          isRecording
            ? `bg-red-500 ${size === "xl" ? "shadow-[0_0_40px_rgba(239,68,68,0.6)]" : "shadow-[0_0_24px_rgba(239,68,68,0.4)]"} scale-105`
            : idleClassName
        }`}
      >
        {isRecording
          ? <div className={`${stop} bg-white ${stopRound} animate-pulse`} />
          : <Mic className={`${icon} ${micDenied ? "text-red-400" : "text-white/80"}`} />
        }
        
        {/* Level bars - inside button at bottom */}
        <div className={`absolute bottom-1.5 left-0 right-0 flex items-end justify-center gap-[2px] pointer-events-none transition-opacity duration-300 ${isRecording ? "opacity-100" : "opacity-0"}`}>
          {levels.map((level, i) => (
            <div
              key={i}
              className="w-1 bg-green-400/80 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(2, level * 10)}px` }}
            />
          ))}
        </div>
      </button>
    </div>
  );
}