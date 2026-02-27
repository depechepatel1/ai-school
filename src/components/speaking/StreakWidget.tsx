import { Flame } from "lucide-react";

interface Props {
  time: number;
}

export default function StreakWidget({ time }: Props) {
  const mins = Math.floor(time / 60);
  const secs = time % 60;
  return (
    <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-2xl border border-orange-500/20 rounded-2xl px-4 py-2.5 shadow-[0_4px_24px_-4px_rgba(249,115,22,0.15)] hover:border-orange-500/30 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/20 flex items-center justify-center">
        <Flame className="w-4 h-4 text-orange-400 animate-flame-premium" />
      </div>
      <div className="font-mono text-sm font-bold text-orange-200 tabular-nums tracking-wide">
        {mins}:{secs.toString().padStart(2, "0")}
      </div>
    </div>
  );
}
