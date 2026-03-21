import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play } from "lucide-react";

const BAR_COUNT = 5;

type MicSize = "sm" | "md" | "lg" | "xl";
type MicShape = "rounded" | "circle";
type RecordingState = "idle" | "recording" | "paused";

interface MicRecordButtonProps {
  /** Simple 2-state mode (backward compat) */
  isRecording?: boolean;
  /** 3-state mode — takes precedence over isRecording */
  recordingState?: RecordingState;
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
  isRecording: isRecordingProp,
  recordingState: recordingStateProp,
  micDenied = false,
  onToggle,
  stream,
  size = "md",
  shape = "rounded",
  idleClassName = "bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]",
  className = "",
}: MicRecordButtonProps) {
  // Derive state — 3-state prop takes precedence
  const state: RecordingState = recordingStateProp ?? (isRecordingProp ? "recording" : "idle");
  const isActive = state === "recording";
  const isPaused = state === "paused";

  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isActive && stream) {
      // Reuse existing AudioContext if possible
      let ctx = ctxRef.current;
      if (!ctx || ctx.state === "closed") {
        ctx = new AudioContext();
        ctxRef.current = ctx;
      }
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);

      let active = true;
      const tick = () => {
        if (!active) return;
        analyser.getByteFrequencyData(buf);
        const step = Math.floor(buf.length / BAR_COUNT);
        setLevels(Array.from({ length: BAR_COUNT }, (_, i) => {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += buf[i * step + j];
          return Math.min(1, (sum / step) / 160);
        }));
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);

      return () => {
        active = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        src.disconnect();
        analyserRef.current = null;
        setLevels(Array(BAR_COUNT).fill(0));
      };
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      analyserRef.current = null;
      setLevels(Array(BAR_COUNT).fill(0));
    }
  }, [isActive, stream]);

  // Close AudioContext on unmount
  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  const { btn, icon, stop } = SIZE_MAP[size];
  const shapeClass = SHAPE_MAP[shape];

  // Status dot color
  const dotClass = micDenied
    ? "bg-red-500"
    : isActive
      ? "bg-green-500 animate-pulse"
      : isPaused
        ? "bg-amber-400 animate-pulse"
        : "bg-white/20";

  // Button style per state
  const btnStateClass = isActive
    ? `bg-red-500 ${size === "xl" ? "shadow-[0_0_40px_rgba(239,68,68,0.6)]" : "shadow-[0_0_24px_rgba(239,68,68,0.4)]"} scale-105`
    : isPaused
      ? "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
      : idleClassName;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Status dot */}
      <div className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 border-black/30 z-10 transition-all ${dotClass}`} />

      {/* Pulsing ring animation when recording */}
      {isActive && (
        <>
          <div className={`absolute inset-0 ${shapeClass} bg-red-500/20 animate-ping`} />
          <div className={`absolute -inset-1 ${shapeClass} border-2 border-red-400/30 animate-pulse`} />
        </>
      )}

      {/* Amber breathing ring when paused */}
      {isPaused && (
        <div className={`absolute -inset-1 ${shapeClass} border-2 border-amber-400/30 animate-pulse`} />
      )}

      {/* Button */}
      <button
        onClick={onToggle}
        title={isActive ? "Pause" : isPaused ? "Resume" : "Record"}
        className={`relative ${btn} ${shapeClass} flex items-center justify-center transition-all duration-300 ${btnStateClass}`}
      >
        {isActive ? (
          <Pause className={`${icon} text-white`} />
        ) : isPaused ? (
          <Play className={`${icon} text-white ml-0.5`} />
        ) : (
          <Mic className={`${icon} ${micDenied ? "text-red-400" : "text-white/80"}`} />
        )}
        
        {/* Level bars - inside button at bottom */}
        <div className={`absolute bottom-1.5 left-0 right-0 flex items-end justify-center gap-[2px] pointer-events-none transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0"}`}>
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
