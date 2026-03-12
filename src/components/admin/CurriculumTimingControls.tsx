/**
 * Timing measurement controls for curriculum upload panel.
 */
import { Loader2, Timer, XCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { TIMING_PATHS } from "./curriculum-helpers";

interface TimingJob {
  label: string;
  path: string;
  run: () => Promise<void>;
}

interface CurriculumTimingControlsProps {
  isMeasuring: boolean;
  measureLabel: string;
  measureProgress: { current: number; total: number };
  timingStatus: Record<string, boolean | null>;
  timingJobs: TimingJob[];
  onMeasureAll: (force: boolean) => void;
  onMeasureSingle: (index: number) => void;
  onCancel: () => void;
}

export default function CurriculumTimingControls({
  isMeasuring,
  measureLabel,
  measureProgress,
  timingStatus,
  timingJobs,
  onMeasureAll,
  onMeasureSingle,
  onCancel,
}: CurriculumTimingControlsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onMeasureAll(false)}
        disabled={isMeasuring}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/20 text-amber-300 text-[10px] font-bold hover:bg-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isMeasuring ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            {measureLabel} {measureProgress.current}/{measureProgress.total}
          </>
        ) : (
          <>
            <Timer className="w-3 h-3" />
            Time Missing
          </>
        )}
      </button>
      <button
        onClick={() => onMeasureAll(true)}
        disabled={isMeasuring}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-400/15 text-red-300 text-[10px] font-bold hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Timer className="w-3 h-3" />
        Re-time All
      </button>
      {isMeasuring && (
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 text-[10px] font-bold hover:bg-red-500/35 transition-all animate-pulse"
        >
          <XCircle className="w-3 h-3" />
          Cancel
        </button>
      )}
      {timingJobs.map((job, idx) => {
        const status = timingStatus[job.path];
        return (
          <button
            key={job.path}
            onClick={() => onMeasureSingle(idx)}
            disabled={isMeasuring}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              status === false
                ? "bg-red-500/10 border border-red-400/20 text-red-300 hover:bg-red-500/20"
                : status === true
                ? "bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/80"
            }`}
          >
            {status === false ? (
              <AlertTriangle className="w-2.5 h-2.5" />
            ) : status === true ? (
              <CheckCircle className="w-2.5 h-2.5" />
            ) : (
              <Timer className="w-2.5 h-2.5" />
            )}
            {job.label}
          </button>
        );
      })}
    </div>
  );
}
