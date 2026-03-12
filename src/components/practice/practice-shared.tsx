/**
 * Shared UI components for practice screens (Fluency, Pronunciation, Speaking).
 * Extracted to reduce duplication across the three practice components.
 * Wrapped in React.memo to prevent unnecessary re-renders during audio playback.
 */
import { memo } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PracticeBackButtonProps {
  badgeClass: string;
  badgeLabel: string;
}

export const PracticeHeader = memo(function PracticeHeader({ badgeClass, badgeLabel }: PracticeBackButtonProps) {
  const navigate = useNavigate();
  return (
    <div className="absolute top-4 left-4 z-[300] flex items-center gap-2">
      <button
        onClick={() => navigate("/student")}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-2xl border border-white/10 text-white/60 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all text-[11px] font-semibold tracking-wide group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
      </button>
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] backdrop-blur-2xl border ${badgeClass}`}>
        {badgeLabel}
      </span>
    </div>
  );
});

interface PracticeProgressProps {
  label: string;
  current: number;
  total: number;
  subLabel?: string;
}

export const PracticeProgress = memo(function PracticeProgress({ label, current, total, subLabel }: PracticeProgressProps) {
  return (
    <div className="absolute top-4 right-4 z-50">
      <div className="bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-4 py-2.5 text-center">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 block">{label}</span>
        <span className="text-lg font-bold text-white/90">{current}</span>
        <span className="text-white/30 text-sm font-medium"> / {total}</span>
        {subLabel && (
          <div className="mt-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-sky-400">{subLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
});
