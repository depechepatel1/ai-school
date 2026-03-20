/**
 * Timing measurement controls for curriculum upload panel.
 */
import { Loader2, Timer, XCircle, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";

interface TimingJob {
  label: string;
  path: string;
  run: () => Promise<void>;
}

interface CurriculumTimingControlsProps {
  isMeasuring: boolean;
  measureLabel: string;
  measureProgress: { current: number; total: number };
  timingStatus: Record<string, "complete" | "partial" | "missing" | null>;
  timingPartialInfo: Record<string, { measured: number } | null>;
  timingJobs: TimingJob[];
  onMeasureAll: (force: boolean) => void;
  onMeasureSingle: (index: number) => void;
  onResumePartial: () => void;
  onCancel: () => void;
}

export default function CurriculumTimingControls({
  isMeasuring,
  measureLabel,
  measureProgress,
  timingStatus,
  timingPartialInfo,
  timingJobs,
  onMeasureAll,
  onMeasureSingle,
  onResumePartial,
  onCancel,
}: CurriculumTimingControlsProps) {
  const hasPartial = Object.values(timingStatus).some((s) => s === "partial");

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
      {hasPartial && !isMeasuring && (
        <button
          onClick={onResumePartial}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/15 border border-orange-400/25 text-orange-300 text-[10px] font-bold hover:bg-orange-500/25 transition-all animate-pulse"
        >
          <RotateCcw className="w-3 h-3" />
          Resume Partial
        </button>
      )}
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
        const partial = timingPartialInfo[job.path];
        return (
          <button
            key={job.path}
            onClick={() => onMeasureSingle(idx)}
            disabled={isMeasuring}
            title={status === "partial" && partial ? `Partial: ${partial.measured} chunks measured — click to resume` : undefined}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              status === "missing"
                ? "bg-red-500/10 border border-red-400/20 text-red-300 hover:bg-red-500/20"
                : status === "partial"
                ? "bg-orange-500/10 border border-orange-400/20 text-orange-300 hover:bg-orange-500/20"
                : status === "complete"
                ? "bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/80"
            }`}
          >
            {status === "missing" ? (
              <AlertTriangle className="w-2.5 h-2.5" />
            ) : status === "partial" ? (
              <RotateCcw className="w-2.5 h-2.5" />
            ) : status === "complete" ? (
              <CheckCircle className="w-2.5 h-2.5" />
            ) : (
              <Timer className="w-2.5 h-2.5" />
            )}
            {job.label}
            {status === "partial" && partial && (
              <span className="text-[8px] opacity-70 ml-0.5">({partial.measured})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
