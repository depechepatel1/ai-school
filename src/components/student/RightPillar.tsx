import { useState } from "react";
import { Snowflake } from "lucide-react";
import FlickeringFire from "./FlickeringFire";
import SatelliteWidget from "./SatelliteWidget";
import { useStreak } from "@/hooks/useStreak";
import { useAuth } from "@/lib/auth";
import { AnimatePresence, motion } from "framer-motion";

interface RightPillarProps {
  onNavigate: (section: string) => void;
  speakingProgress?: number;
}

export default function RightPillar({ onNavigate, speakingProgress }: RightPillarProps) {
  const { user } = useAuth();
  const { currentStreak, loading } = useStreak(user?.id ?? null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const streakLabel = loading ? "..." : `${currentStreak} Day Streak`;

  return (
    <div className="absolute top-0 right-0 bottom-24 w-[280px] p-6 flex flex-col gap-4 z-20">
      {/* Streak Card */}
      <div className="relative group-container">
        <div className="absolute inset-0 rounded-2xl overflow-hidden bg-background/60 border border-border shadow-[0_0_20px_hsl(var(--primary)/0.15)] transition-all hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:border-border/80">
          <div className="absolute top-0 left-0 w-1/2 h-full bg-orange-500/5 blur-xl" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-cyan-500/5 blur-xl" />
        </div>
        <div className="relative rounded-2xl p-4 flex justify-around items-center z-10">
          <div className="flex flex-col items-center relative cursor-help group/fire" onMouseEnter={() => setActiveTooltip('fire')} onMouseLeave={() => setActiveTooltip(null)}>
            <div className="group-hover/fire:scale-110 transition-transform duration-300 group-active/fire:scale-95">
              <FlickeringFire />
            </div>
            <span className="text-xs font-bold text-orange-100 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)] mt-1">{streakLabel}</span>
            <AnimatePresence>
              {activeTooltip === 'fire' && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max bg-orange-600 text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-50"
                >
                  {currentStreak >= 7 ? "🔥 Amazing! Keep it going!" : currentStreak > 0 ? "🔥 Great start!" : "Start practicing to build your streak!"}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-border to-transparent" />
          <div className="flex flex-col items-center relative cursor-pointer group/ice" onMouseEnter={() => setActiveTooltip('ice')} onMouseLeave={() => setActiveTooltip(null)}>
            <div className="relative drop-shadow-[0_0_12px_rgba(34,211,238,0.9)] group-hover/ice:scale-110 transition-transform duration-300 group-active/ice:scale-95">
              <Snowflake className="w-10 h-10 text-cyan-400 mb-1 group-hover/ice:rotate-12 transition-transform" />
            </div>
            <span className="text-xs font-bold text-cyan-100 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">1 Day Off</span>
            <AnimatePresence>
              {activeTooltip === 'ice' && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full right-0 mt-2 w-32 bg-background/90 border border-ring/30 rounded-lg p-2 text-[10px] text-cyan-100 z-50"
                >
                  Weekly Streak day off used. Next one available after 2 days.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Satellite Widget */}
      <div className="flex-1 flex items-center justify-center relative overflow-visible mt-4 -translate-x-8">
        <SatelliteWidget onNavigate={onNavigate} speakingProgress={speakingProgress} />
      </div>
    </div>
  );
}
