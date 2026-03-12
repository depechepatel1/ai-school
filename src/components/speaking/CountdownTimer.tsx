import { memo } from "react";
import { Flame, Pause, Play, Check } from "lucide-react";

interface Props {
  /** Total seconds of countdown from timer_settings */
  countdownFrom: number;
  /** Seconds actively practiced */
  activeSeconds: number;
  /** Whether timer is running */
  isRunning: boolean;
  onPause: () => void;
  onResume: () => void;
  label?: string;
}

function CountdownTimer({ countdownFrom, activeSeconds, isRunning, onPause, onResume, label }: Props) {
  const remaining = countdownFrom * 60 - activeSeconds;
  const isComplete = remaining <= 0;
  const isOvertime = remaining < 0;
  const displaySeconds = isComplete ? Math.abs(remaining) : remaining;

  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;

  const borderColor = isComplete
    ? "border-emerald-500/30"
    : isRunning
      ? "border-orange-500/20"
      : "border-white/10";

  const shadowColor = isComplete
    ? "shadow-[0_4px_24px_-4px_rgba(16,185,129,0.2)]"
    : "shadow-[0_4px_24px_-4px_rgba(249,115,22,0.15)]";

  const timeColor = isComplete
    ? "text-emerald-300"
    : remaining <= 60
      ? "text-red-400 animate-pulse"
      : "text-orange-200";

  const iconBg = isComplete
    ? "from-emerald-500/20 to-green-500/10 border-emerald-500/20"
    : "from-orange-500/20 to-red-500/10 border-orange-500/20";

  return (
    <div className={`flex items-center gap-2.5 bg-black/50 backdrop-blur-2xl border ${borderColor} rounded-2xl px-4 py-2.5 ${shadowColor} transition-colors`}>
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${iconBg} flex items-center justify-center`}>
        {isComplete ? <Check className="w-4 h-4 text-emerald-400" /> : <Flame className="w-4 h-4 text-orange-400 animate-pulse" />}
      </div>
      <div className="flex flex-col">
        {label && <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 mb-0.5">{label}</span>}
        <div className={`font-mono text-sm font-bold tabular-nums tracking-wide ${timeColor}`}>
          {isOvertime && "+"}
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
        {isComplete && <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/70">{isOvertime ? "Extended Time" : "Done!"}</span>}
        {!isComplete && !isRunning && <span className="text-[8px] font-bold uppercase tracking-widest text-white/30">Paused</span>}
      </div>
      <button
        onClick={isRunning ? onPause : onResume}
        className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
        title={isRunning ? "Pause" : "Resume"}
      >
        {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </button>
    </div>
  );
}

export default memo(CountdownTimer);
