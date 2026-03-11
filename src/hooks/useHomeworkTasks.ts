import { useState, useEffect } from "react";
import { fetchTodayPracticeLogs, fetchSelectedWeek, fetchStudentCourseType } from "@/services/db";

export interface HomeworkTask {
  id: string;
  activity: "shadowing" | "pronunciation" | "speaking";
  label: string;
  description: string;
  targetSeconds: number;
  activeSeconds: number;
  completed: boolean;
  accent: string;
  iconBg: string;
  iconColor: string;
}

/** Default targets by course type and activity (seconds) */
const TARGETS: Record<string, Record<string, number>> = {
  ielts: { shadowing: 900, pronunciation: 600, speaking: 1200 },
  igcse: { shadowing: 600, pronunciation: 600, speaking: 600 },
};

const DESCRIPTIONS: Record<string, Record<string, string>> = {
  ielts: {
    shadowing: "Shadow read model answers + tongue twisters",
    pronunciation: "Pronunciation drills & tongue twisters",
    speaking: "Record Part 2 answers (3 × 2 min)",
  },
  igcse: {
    shadowing: "Shadow model answers until precise",
    pronunciation: "Pronunciation drills & practice",
    speaking: "Record audio answering this week's question",
  },
};

const STYLE: Record<string, { accent: string; iconBg: string; iconColor: string }> = {
  shadowing: { accent: "hsl(190 80% 50% / 0.5)", iconBg: "bg-cyan-500/20", iconColor: "text-cyan-300" },
  pronunciation: { accent: "hsl(24 100% 50% / 0.5)", iconBg: "bg-amber-500/20", iconColor: "text-amber-300" },
  speaking: { accent: "hsl(280 80% 50% / 0.5)", iconBg: "bg-purple-500/20", iconColor: "text-purple-300" },
};

export function useHomeworkTasks(userId: string | null) {
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [courseType, setCourseType] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    (async () => {
      try {
        const [week, course, logs] = await Promise.all([
          fetchSelectedWeek(userId),
          fetchStudentCourseType(userId),
          fetchTodayPracticeLogs(userId, "homework"),
        ]);

        const ct = course ?? "ielts";
        const wk = week ?? 1;
        setCourseType(ct);
        setWeekNumber(wk);

        const targets = TARGETS[ct] ?? TARGETS.ielts;
        const descs = DESCRIPTIONS[ct] ?? DESCRIPTIONS.ielts;

        // Aggregate today's practice by activity
        const agg: Record<string, number> = {};
        for (const log of logs) {
          agg[log.activity_type] = (agg[log.activity_type] ?? 0) + log.active_seconds;
        }

        const activities: Array<"shadowing" | "pronunciation" | "speaking"> = ["shadowing", "pronunciation", "speaking"];
        const result: HomeworkTask[] = activities.map((act) => {
          const target = targets[act] ?? 600;
          const active = agg[act] ?? 0;
          const style = STYLE[act];
          return {
            id: `${act}-wk${wk}`,
            activity: act,
            label: act.charAt(0).toUpperCase() + act.slice(1),
            description: descs[act] ?? "",
            targetSeconds: target,
            activeSeconds: active,
            completed: active >= target,
            ...style,
          };
        });

        setTasks(result);
      } catch (e) {
        console.error("useHomeworkTasks:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const completedCount = tasks.filter((t) => t.completed).length;
  return { tasks, loading, weekNumber, courseType, completedCount, totalCount: tasks.length };
}
