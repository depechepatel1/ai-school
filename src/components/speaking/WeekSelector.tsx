import { Calendar } from "lucide-react";

interface WeekSelectorProps {
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  maxWeek?: number;
}

export default function WeekSelector({ selectedWeek, onWeekChange, maxWeek = 20 }: WeekSelectorProps) {
  return (
    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-3 py-2">
      <Calendar className="w-3.5 h-3.5 text-white/40" />
      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">Week</span>
      <select
        value={selectedWeek}
        onChange={(e) => onWeekChange(Number(e.target.value))}
        className="bg-transparent text-white text-sm font-bold border-none outline-none cursor-pointer appearance-none pr-2"
      >
        {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
          <option key={w} value={w} className="bg-gray-900 text-white">
            {w}
          </option>
        ))}
      </select>
    </div>
  );
}
