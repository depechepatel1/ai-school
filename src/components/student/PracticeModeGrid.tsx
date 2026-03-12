/**
 * Practice Mode Selector Grid
 * Shows 3 practice modes (Pronunciation, Fluency, Speaking)
 * Routes are course-aware (IELTS vs IGCSE)
 */
import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Headphones, AudioWaveform, MessageSquare, Loader2 } from "lucide-react";

interface PracticeModeGridProps {
  courseType: "ielts" | "igcse" | null;
  loading?: boolean;
}

const MODES = [
  {
    key: "pronunciation",
    label: "Pronunciation",
    sublabel: "Tongue Twisters",
    icon: Headphones,
    color: "from-sky-500/80 to-cyan-500/80",
    glow: "rgba(14,165,233,0.4)",
    border: "border-sky-400/30",
  },
  {
    key: "fluency",
    label: "Fluency",
    sublabel: "Shadowing",
    icon: AudioWaveform,
    color: "from-violet-500/80 to-purple-500/80",
    glow: "rgba(139,92,246,0.4)",
    border: "border-violet-400/30",
  },
  {
    key: "speaking",
    label: "Speaking",
    sublabel: "AI Conversation",
    icon: MessageSquare,
    color: "from-amber-500/80 to-orange-500/80",
    glow: "rgba(245,158,11,0.4)",
    border: "border-amber-400/30",
  },
] as const;

export default memo(function PracticeModeGrid({ courseType, loading }: PracticeModeGridProps) {
  const navigate = useNavigate();
  const prefix = useMemo(() => courseType === "ielts" ? "/ielts" : "/igcse", [courseType]);

  if (loading || !courseType) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center mb-1">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
          Choose Practice Mode
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        {MODES.map((mode, i) => {
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`${prefix}/${mode.key}`)}
              className={`relative flex flex-col items-center gap-2.5 px-3 py-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border ${mode.border} hover:bg-white/[0.08] transition-all group`}
              style={{ boxShadow: `0 0 30px -10px ${mode.glow}` }}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-white/90">{mode.label}</div>
                <div className="text-[9px] text-white/40 font-medium mt-0.5">{mode.sublabel}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20 mt-1">
        {courseType.toUpperCase()} Course
      </span>
    </div>
  );
});
