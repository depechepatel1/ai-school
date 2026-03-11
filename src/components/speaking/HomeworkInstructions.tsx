import { useState, useEffect } from "react";
import { ChevronDown, BookOpen, Check } from "lucide-react";
import { fetchTodayPracticeLogs } from "@/services/db";

interface Props {
  courseType: "ielts" | "igcse";
  selectedWeek: number;
  shadowingWeek: number;
  userId: string | null;
}

interface TaskProgress {
  activeSeconds: number;
  targetSeconds: number;
}

function ProgressBar({ progress }: { progress: TaskProgress }) {
  const pct = Math.min(100, (progress.activeSeconds / progress.targetSeconds) * 100);
  const done = pct >= 100;
  const mins = Math.floor(progress.activeSeconds / 60);
  const targetMins = Math.floor(progress.targetSeconds / 60);

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-400" : "bg-cyan-400/70"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] font-semibold text-white/50 tabular-nums min-w-[3.5rem] text-right">
        {mins}/{targetMins} min
      </span>
      {done && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
    </div>
  );
}

export default function HomeworkInstructions({ courseType, selectedWeek, shadowingWeek, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<Record<string, TaskProgress>>({});

  useEffect(() => {
    if (!userId || !open) return;

    const load = async () => {
      const { data } = await supabase
        .from("student_practice_logs")
        .select("activity_type, active_seconds, target_seconds")
        .eq("user_id", userId)
        .eq("week_number", selectedWeek)
        .eq("practice_mode", "homework");

      if (!data) return;

      // Aggregate by activity_type (may have multiple daily logs)
      const agg: Record<string, TaskProgress> = {};
      for (const row of data) {
        if (!agg[row.activity_type]) {
          agg[row.activity_type] = { activeSeconds: 0, targetSeconds: row.target_seconds };
        }
        agg[row.activity_type].activeSeconds += row.active_seconds;
      }
      setProgress(agg);
    };

    load().catch(console.error);
  }, [userId, selectedWeek, open]);

  const getProgress = (type: string): TaskProgress =>
    progress[type] ?? { activeSeconds: 0, targetSeconds: courseType === "ielts" && type !== "pronunciation" ? 900 : 600 };

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
                <ProgressBar progress={getProgress("shadowing")} />
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div>
                <span className="text-purple-300/80 font-bold uppercase text-[9px] tracking-wider">Post-Homework · Recording</span>
                <p className="mt-0.5">Record a 2-min audio answering this week's Section 6 question. Use 1 complex sentence + Present Perfect tense.</p>
                <ProgressBar progress={getProgress("speaking")} />
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-cyan-300/80 font-bold uppercase text-[9px] tracking-wider">Part 1 · Shadow Reading (15 min)</span>
                <p className="mt-0.5">Shadow read all model answers for Week {shadowingWeek} (10 min) + Tongue Twisters (5 min).</p>
                <ProgressBar progress={getProgress("shadowing")} />
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div>
                <span className="text-purple-300/80 font-bold uppercase text-[9px] tracking-wider">Part 2 · Speaking Practice (20 min)</span>
                <p className="mt-0.5">Record answers for all 3 Part 2 questions (3 × 2 min).</p>
                <ProgressBar progress={getProgress("speaking")} />
              </div>
              <div className="w-full h-px bg-white/[0.06]" />
              <div>
                <span className="text-amber-300/80 font-bold uppercase text-[9px] tracking-wider">Pronunciation · Tongue Twisters</span>
                <p className="mt-0.5">Practice pronunciation with tongue twisters (10 min).</p>
                <ProgressBar progress={getProgress("pronunciation")} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
