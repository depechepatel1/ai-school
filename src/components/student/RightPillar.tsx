import { useState } from "react";
import { Snowflake } from "lucide-react";
import FlickeringFire from "./FlickeringFire";
import SatelliteWidget from "./SatelliteWidget";

interface RightPillarProps {
  inDrawer?: boolean;
  streak?: number;
  restDays?: number;
}

export default function RightPillar({ inDrawer = false, streak = 0, restDays = 0 }: RightPillarProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const wrapperClass = inDrawer
    ? "w-full flex flex-col gap-4"
    : "absolute top-0 right-0 bottom-24 w-[280px] p-6 flex flex-col gap-4 z-20";

  return (
    <div className={wrapperClass}>
      {/* Streak Card */}
      <div className="relative group-container">
        <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:border-white/30">
          <div className="absolute top-0 left-0 w-1/2 h-full bg-orange-500/5 blur-xl" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-cyan-500/5 blur-xl" />
        </div>
        <div className="relative rounded-2xl p-4 flex justify-around items-center z-10">
          <div className="flex flex-col items-center relative cursor-help group/fire" onMouseEnter={() => setActiveTooltip('fire')} onMouseLeave={() => setActiveTooltip(null)}>
            <div className="group-hover/fire:scale-110 transition-transform duration-300 group-active/fire:scale-95">
              <FlickeringFire />
            </div>
            <span className="text-xs font-bold text-orange-100 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)] mt-1">
              {streak} Day Streak
            </span>
            {activeTooltip === 'fire' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max bg-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg animate-fade-in-up z-50">
                🔥 Practice daily to build your streak!
              </div>
            )}
          </div>
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <div className="flex flex-col items-center relative cursor-pointer group/ice" onMouseEnter={() => setActiveTooltip('ice')} onMouseLeave={() => setActiveTooltip(null)}>
            <div className="relative drop-shadow-[0_0_12px_rgba(34,211,238,0.9)] group-hover/ice:scale-110 transition-transform duration-300 group-active/ice:scale-95">
              <Snowflake className="w-10 h-10 text-cyan-400 mb-1 group-hover/ice:rotate-12 transition-transform" />
            </div>
            <span className="text-xs font-bold text-cyan-100 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
              {restDays} Days Off
            </span>
            {activeTooltip === 'ice' && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-black/90 border border-cyan-500/30 rounded-lg p-2 text-[9px] text-cyan-100 z-50 animate-fade-in-up">
                Rest days this week. Practice to keep your streak going!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Satellite Widget */}
      <div className={`flex-1 flex items-center justify-center relative overflow-visible mt-4 ${inDrawer ? '' : '-translate-x-8'}`}>
        <SatelliteWidget onNavigate={() => {}} />
      </div>
    </div>
  );
}
