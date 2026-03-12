import { Star } from "lucide-react";

interface Props {
  xp: number;
  level: number;
}

export default function XPWidget({ xp, level }: Props) {
  return (
    <div className="flex gap-3 items-center bg-black/50 backdrop-blur-2xl border border-amber-500/20 rounded-2xl pl-3 pr-5 py-2.5 shadow-[0_4px_24px_-4px_rgba(250,204,21,0.15)] hover:border-amber-500/30 transition-colors">
      <div className="relative w-9 h-9 flex items-center justify-center">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20" />
        <Star className="w-4 h-4 text-amber-400 fill-current drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
      </div>
      <div className="flex flex-col w-28">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mb-1">
          <span>Lvl {level}</span>
          <span className="text-amber-200">{xp} XP</span>
        </div>
        <div className="h-1 bg-black/60 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000" style={{ width: `${xp % 100}%` }} />
        </div>
      </div>
    </div>
  );
}
