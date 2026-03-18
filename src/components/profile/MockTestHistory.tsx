import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Trophy, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import BandScoreDonut from "@/components/mock-test/BandScoreDonut";

type Session = Tables<"mock_test_sessions">;

interface Props {
  userId: string | undefined;
}

export default function MockTestHistory({ userId }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("mock_test_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSessions(data ?? []);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/40">
        <Trophy className="w-8 h-8" />
        <p className="text-sm font-medium">No mock tests yet</p>
        <p className="text-xs text-white/25">Complete an IELTS mock test to see your history here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
      {sessions.map((s, i) => {
        const band = s.overall_band ?? "—";
        const date = new Date(s.created_at);
        const criteria = (s.criteria_scores as Record<string, { score: number; assessment: string }> | null) ?? {};
        const expanded = expandedId === s.id;
        const mins = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null;

        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <button
              onClick={() => setExpandedId(expanded ? null : s.id)}
              className="w-full text-left bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl px-4 py-3 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10">
                  <BandScoreDonut score={band} size={40} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white/90">Band {band}</span>
                    {s.week_number && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/40 font-medium">
                        Week {s.week_number}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/40 font-medium uppercase">
                      {s.accent}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-white/30 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {mins && (
                      <span className="text-[10px] text-white/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {mins} min
                      </span>
                    )}
                    <span className="text-[10px] text-white/30">
                      Parts: {(s.parts_completed ?? []).join(", ") || "—"}
                    </span>
                  </div>
                </div>
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-white/30 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
                )}
              </div>
            </button>

            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 space-y-2">
                  {Object.entries(criteria).length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(criteria).map(([key, val]) => (
                        <div key={key} className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.05]">
                          <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{key}</div>
                          <div className="text-sm font-bold text-white/80 mt-0.5">{val.score}</div>
                          {val.assessment && (
                            <div className="text-[10px] text-white/30 mt-0.5 line-clamp-2">{val.assessment}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/30">No detailed scores available.</p>
                  )}
                  {s.vocabulary_suggestions && (s.vocabulary_suggestions as string[]).length > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Vocabulary</div>
                      <div className="flex flex-wrap gap-1">
                        {(s.vocabulary_suggestions as string[]).map((w, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] text-white/50">{w}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
