import { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";

interface Props {
  courseType: "ielts" | "igcse";
  selectedWeek: number;
  shadowingWeek: number;
}

export default function HomeworkInstructions({ courseType, selectedWeek, shadowingWeek }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 w-full">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 hover:text-white/70 transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5" />
        Homework Tasks
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 bg-white/[0.04] border border-white/[0.08] rounded-xl p-3.5 text-[11px] leading-relaxed text-white/70 space-y-2.5 animate-fade-in">
          {courseType === "igcse" ? (
            <>
              <div>
                <span className="text-cyan-300/80 font-bold uppercase text-[9px] tracking-wider">Pre-Homework · Shadowing</span>
                <p className="mt-0.5">Shadow Week {shadowingWeek} Model Answers until you can repeat each sentence precisely (10 min).</p>
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div>
                <span className="text-purple-300/80 font-bold uppercase text-[9px] tracking-wider">Post-Homework · Recording</span>
                <p className="mt-0.5">Record a 2-min audio answering this week's Section 6 question. Use 1 complex sentence + Present Perfect tense.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-cyan-300/80 font-bold uppercase text-[9px] tracking-wider">Part 1 · Shadow Reading (15 min)</span>
                <p className="mt-0.5">Shadow read all model answers for Week {shadowingWeek} (10 min) + Tongue Twisters (5 min).</p>
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div>
                <span className="text-purple-300/80 font-bold uppercase text-[9px] tracking-wider">Part 2 · Speaking Practice (20 min)</span>
                <p className="mt-0.5">Record answers for all 3 Part 2 questions (3 × 2 min).</p>
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div>
                <span className="text-amber-300/80 font-bold uppercase text-[9px] tracking-wider">Part 3 · Follow-up Questions</span>
                <p className="mt-0.5">Record answers for all Part 3 questions (6 × 1 min).</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
