import { Calendar } from "lucide-react";

interface WeekSelectorProps {
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  maxWeek?: number;
  contextLabel?: string;
  courseType?: "ielts" | "igcse" | null;
}

export default function WeekSelector({ selectedWeek, onWeekChange, maxWeek = 20, contextLabel, courseType }: WeekSelectorProps) {
  const courseLabel = courseType === "ielts" ? "IELTS" : courseType === "igcse" ? "IGCSE" : null;

  return (
    <div className="flex flex-col items-start gap-1.5 bg-black/60 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-5 py-3.5">
      {courseLabel && (
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{courseLabel} Course</span>
      )}
      <div className="flex items-center gap-2.5">
        <Calendar className="w-5 h-5 text-white/50" />
        <span className="text-sm font-bold uppercase tracking-[0.1em] text-white/50">Week</span>
        <select
          value={selectedWeek}
          onChange={(e) => onWeekChange(Number(e.target.value))}
          className="bg-transparent text-white text-xl font-bold border-none outline-none cursor-pointer appearance-none pr-1"
        >
          {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w} className="bg-gray-900 text-white">
              {w}
            </option>
          ))}
        </select>
      </div>
      {contextLabel && (
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-white/60">{contextLabel}</span>
      )}
    </div>
  );
}
