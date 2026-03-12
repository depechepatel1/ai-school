import { Flame, Pause, Play, Check } from "lucide-react";

interface Props {
  /** Display time in seconds */
  displaySeconds: number;
  /** Whether counting down (true) or counting up overtime (false) */
  isCountdown: boolean;
  /** Whether the target has been reached */
  isComplete: boolean;
  /** Whether the timer is actively running */
  isRunning: boolean;
  /** Whether overtime */
  isOvertime: boolean;
  /** Label shown above the time */
  modeLabel?: string;
  onPause?: () => void;
  onResume?: () => void;
}

export default function StreakWidget({
  displaySeconds,
  isCountdown,
  isComplete,
  isRunning,
  isOvertime,
  modeLabel,
  onPause,
  onResume,
}: Props) {
  const absSeconds = Math.abs(displaySeconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;

  // Color states
  const borderColor = isComplete
    ? isOvertime
      ? "border-emerald-500/30"
      : "border-emerald-500/20"
    : isRunning
      ? "border-orange-500/20"
      : "border-white/10";

  const shadowColor = isComplete
    ? "shadow-[0_4px_24px_-4px_rgba(16,185,129,0.2)]"
    : "shadow-[0_4px_24px_-4px_rgba(249,115,22,0.15)]";

  const iconBg = isComplete
    ? "from-emerald-500/20 to-green-500/10 border-emerald-500/20"
    : "from-orange-500/20 to-red-500/10 border-orange-500/20";

  const timeColor = isComplete
    ? "text-emerald-300"
    : displaySeconds <= 60 && isCountdown
      ? "text-red-400 animate-pulse"
      : "text-orange-200";

  return (
    <div
      className={`flex items-center gap-2.5 bg-black/50 backdrop-blur-2xl border ${borderColor} rounded-2xl px-4 py-2.5 ${shadowColor} hover:border-opacity-50 transition-colors`}
    >
      <div
        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${iconBg} flex items-center justify-center`}
      >
        {isComplete ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Flame className="w-4 h-4 text-orange-400 animate-flame-premium" />
        )}
      </div>

      <div className="flex flex-col">
        {modeLabel && (
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 mb-0.5">{modeLabel}</span>
        )}
        <div className={`font-mono text-sm font-bold tabular-nums tracking-wide ${timeColor}`}>
          {isOvertime && "+"}
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
        {isComplete && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">
            {isOvertime ? "Overtime" : "Done!"}
          </span>
        )}
        {!isComplete && !isRunning && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
            Paused
          </span>
        )}
      </div>

      {/* Pause/Resume button */}
      <button
        onClick={isRunning ? onPause : onResume}
        className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
        title={isRunning ? "Pause" : "Resume"}
      >
        {isRunning ? (
          <Pause className="w-3 h-3" />
        ) : (
          <Play className="w-3 h-3 ml-0.5" />
        )}
      </button>
    </div>
  );
}
