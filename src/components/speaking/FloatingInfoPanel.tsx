import { BookOpen } from "lucide-react";

interface Props {
  course: string;
  weekNumber: number;
  questionType?: string;
  questionNumber?: string;
  questionText?: string;
}

export default function FloatingInfoPanel({ course, weekNumber, questionType, questionNumber, questionText }: Props) {
  return (
    <div className="bg-black/60 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-5 py-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] max-w-xs w-full">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-white/40" />
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">Curriculum Info</span>
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-white/40 font-semibold uppercase tracking-wider text-[9px] w-16">Course</span>
          <span className="text-cyan-300/90 font-bold">{course}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 font-semibold uppercase tracking-wider text-[9px] w-16">Week</span>
          <span className="text-white/80 font-bold">Week {weekNumber}</span>
        </div>
        {questionType && (
          <div className="flex items-center gap-2">
            <span className="text-white/40 font-semibold uppercase tracking-wider text-[9px] w-16">Type</span>
            <span className="text-purple-300/80 font-bold">{questionType}</span>
          </div>
        )}
        {questionNumber && (
          <div className="flex items-center gap-2">
            <span className="text-white/40 font-semibold uppercase tracking-wider text-[9px] w-16">Question</span>
            <span className="text-amber-300/80 font-bold">{questionNumber}</span>
          </div>
        )}
      </div>
      {questionText && (
        <>
          <div className="w-full h-px bg-white/[0.06] my-3" />
          <p className="text-[12px] text-white/70 leading-relaxed italic">
            Q: {questionText}
          </p>
        </>
      )}
    </div>
  );
}
