import { ChevronRight } from "lucide-react";
import WeekSelector from "./WeekSelector";
import HomeworkInstructions from "./HomeworkInstructions";

interface SpeakingLeftPanelProps {
  weekNumber: number;
  onWeekChange: (week: number) => void;
  courseType: "ielts" | "igcse" | null;
  sectionLabel: string;
  questionIndex: number;
  totalQuestions: number;
  onNextQuestion?: () => void;
  showHomeworkTasks?: boolean;
  shadowingWeek?: number;
  userId?: string | null;
}

export default function SpeakingLeftPanel({
  weekNumber,
  onWeekChange,
  courseType,
  sectionLabel,
  questionIndex,
  totalQuestions,
  onNextQuestion,
  showHomeworkTasks,
  shadowingWeek,
  userId,
}: SpeakingLeftPanelProps) {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[80] w-[200px] flex flex-col gap-3 animate-fade-in">
      {/* Week & Question info card */}
      <div className="bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
        {/* Week selector */}
        {courseType && (
          <div className="mb-3">
            <WeekSelector
              selectedWeek={weekNumber}
              onWeekChange={onWeekChange}
              courseType={courseType}
            />
          </div>
        )}

        {/* Section & Question number */}
        <div className="flex flex-col gap-1 mb-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">
            {sectionLabel}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white/90">Q{questionIndex + 1}</span>
            {totalQuestions > 1 && (
              <span className="text-sm text-white/30 font-medium">/ {totalQuestions}</span>
            )}
          </div>
        </div>

        {/* Next Question button */}
        {totalQuestions > 1 && onNextQuestion && (
          <button
            onClick={onNextQuestion}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-all group"
          >
            Next Question
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
    </div>
  );
}
