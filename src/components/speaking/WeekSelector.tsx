import { Calendar } from "lucide-react";

interface WeekSelectorProps {
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  maxWeek?: number;
  contextLabel?: string;
}

export default function WeekSelector({ selectedWeek, onWeekChange, maxWeek = 20, contextLabel }: WeekSelectorProps) {
  return (
    <div className="flex flex-col items-end gap-1 bg-black/60 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-white/50" />
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/50">Week</span>
        <select
          value={selectedWeek}
          onChange={(e) => onWeekChange(Number(e.target.value))}
          className="bg-transparent text-white text-lg font-bold border-none outline-none cursor-pointer appearance-none pr-1"
        >
          {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w} className="bg-gray-900 text-white">
              {w}
            </option>
          ))}
        </select>
      </div>
      {contextLabel && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">{contextLabel}</span>
      )}
    </div>
  );
}
