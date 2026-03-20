/**
 * StudentMockTestPanel — Teacher view of a student's mock test session history.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Trophy, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import BandScoreDonut from "@/components/mock-test/BandScoreDonut";

type Session = Tables<"mock_test_sessions">;

interface Props {
  studentId: string;
  studentName: string;
  onBack: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function StudentMockTestPanel({ studentId, studentName, onBack }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("mock_test_sessions")
      .select("*")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSessions(data ?? []);
        setLoading(false);
      });
  }, [studentId]);

  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }} className="flex-1 flex flex-col">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] transition-all text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-200 truncate">{studentName}</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Mock Test History</span>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
            <Trophy className="w-8 h-8" />
            <p className="text-sm font-medium">No mock tests yet</p>
            <p className="text-xs text-gray-600">This student hasn't completed any IELTS mock tests.</p>
          </div>
        )}

        {sessions.map((s, i) => {
          const band = s.overall_band ?? "—";
          const date = new Date(s.created_at);
          const criteria = (s.criteria_scores as Record<string, { score: number; assessment: string }> | null) ?? {};
          const expanded = expandedId === s.id;
          const mins = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null;

          return (
            <motion.div key={s.id} variants={fadeUp}>
              <button
                onClick={() => setExpandedId(expanded ? null : s.id)}
                className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10">
                    <BandScoreDonut score={band} size={40} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-200">Band {band}</span>
                      {s.week_number && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-gray-500 font-medium">
                          Week {s.week_number}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-gray-500 font-medium uppercase">
                        {s.accent}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      {mins && (
                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {mins} min
                        </span>
                      )}
                      <span className="text-[10px] text-gray-600">
                        Parts: {(s.parts_completed ?? []).join(", ") || "—"}
                      </span>
                    </div>
                  </div>
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />
                  )}
                </div>
              </button>

              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 space-y-3">
                    {Object.entries(criteria).length > 0 ? (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {Object.entries(criteria).map(([key, val]) => (
                          <div key={key} className="bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.05]">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{key}</div>
                            <div className="text-sm font-bold text-gray-200 mt-0.5">{val.score}</div>
                            {val.assessment && (
                              <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{val.assessment}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600">No detailed scores available.</p>
                    )}
                    {s.vocabulary_suggestions && (s.vocabulary_suggestions as string[]).length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Vocabulary Suggestions</div>
                        <div className="flex flex-wrap gap-1">
                          {(s.vocabulary_suggestions as string[]).map((w, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-400">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.transcript && (
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Transcript</div>
                        <div className="text-xs text-gray-400 bg-white/[0.02] rounded-lg p-3 border border-white/[0.05] max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {s.transcript}
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
    </motion.div>
  );
}
