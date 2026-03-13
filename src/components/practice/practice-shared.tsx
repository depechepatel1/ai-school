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
