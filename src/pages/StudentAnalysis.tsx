import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Zap, Trophy, Crown, Medal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useAnalyticsData, type Period, type ActivityData } from "@/hooks/useAnalyticsData";
import { useClassLeaderboard } from "@/hooks/useClassLeaderboard";
import { getWeekNumber, getWeekDateRange, SEMESTER_WEEKS, SEMESTER_START } from "@/lib/semester";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANALYSIS_VIDEO = `${SUPABASE_URL}/storage/v1/object/public/videos/analysis-bg.mp4`;

const PERIODS: { key: Period; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "total", label: "Total" },
];

const ACTIVITIES = [
  { key: "shadowing" as const, label: "Shadowing", color: "#22d3ee", barColor: "#22d3ee" },
  { key: "pronunciation" as const, label: "Pronunciation", color: "#fb923c", barColor: "#fb923c" },
  { key: "speaking" as const, label: "Speaking", color: "#a78bfa", barColor: "#a78bfa" },
];

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function ProgressRing({ data, color, label }: { data: ActivityData; color: string; label: string }) {
  const size = 120;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = data.pct;
  const offset = circ * (1 - pct);
  const isOvertime = data.overtime > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" strokeOpacity={0.08} strokeWidth={stroke} />
          {/* Progress ring */}
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(pct * 100)}%</span>
          {isOvertime && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
              +{fmt(data.overtime)}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-white/70">{label}</span>
      <span className="text-[11px] text-white/40 font-medium">{fmt(data.seconds)} / {fmt(data.target)}</span>
    </div>
  );
}

export default function StudentAnalysis() {
  const { user } = useAuth();
  const { courseType } = useCourseWeek(user?.id ?? null);
  const [period, setPeriod] = useState<Period>("daily");
  const { data, loading } = useAnalyticsData(user?.id ?? null, courseType, period);
  const navigate = useNavigate();
  const weekNum = getWeekNumber();

  // Compute date range for leaderboard based on period
  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    if (period === "daily") {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setHours(23, 59, 59, 999);
      return { rangeStart: s, rangeEnd: e };
    } else if (period === "weekly") {
      const wk = getWeekNumber(now) || 1;
      const r = getWeekDateRange(wk);
      return { rangeStart: r.start, rangeEnd: r.end };
    } else if (period === "monthly") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { rangeStart: s, rangeEnd: e };
    } else {
      const s = new Date(`${SEMESTER_START}T00:00:00`);
      return { rangeStart: s, rangeEnd: now };
    }
  }, [period]);

  const { entries: leaderboard, loading: lbLoading } = useClassLeaderboard(user?.id ?? null, rangeStart, rangeEnd);

  return (
    <PageShell fullWidth loopVideos={[ANALYSIS_VIDEO]} hideFooter>
      {/* Full-screen glass card */}
      <div className="absolute inset-4 z-10 flex items-center justify-center">
        <div className="relative w-full h-full max-w-[960px] max-h-[700px] rounded-3xl bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
          {/* Top shimmer */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-3">
            <button onClick={() => navigate("/student")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Back</span>
            </button>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-white/40" />
              <span className="text-sm font-bold text-white/80 uppercase tracking-wider">Practice Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              {courseType && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-white/60 border border-white/10">
                  {courseType.toUpperCase()}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-white/40 border border-white/10">
                W{weekNum}/{SEMESTER_WEEKS}
              </span>
            </div>
          </div>

          {/* Period tabs */}
          <div className="relative z-10 flex items-center gap-1 px-6 pb-4">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`relative px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  period === p.key
                    ? "text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                {period === p.key && (
                  <motion.div
                    layoutId="period-pill"
                    className="absolute inset-0 rounded-full bg-white/15 border border-white/20 shadow-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Content — two columns */}
          <div className="relative z-10 flex-1 flex gap-4 px-6 pb-4 overflow-hidden">
            {/* Left: Analytics */}
            <div className="flex-1 flex flex-col items-center justify-center gap-5 overflow-y-auto">
              {loading || !data ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/40 text-sm animate-pulse">
                  Loading analytics…
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={period}
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.97 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex flex-col items-center gap-5 w-full"
                  >
                    {/* Progress rings */}
                    <div className="flex items-center justify-center gap-8">
                      {ACTIVITIES.map((a, i) => (
                        <motion.div
                          key={a.key}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.08, duration: 0.35, ease: "easeOut" }}
                        >
                          <ProgressRing data={data[a.key]} color={a.color} label={a.label} />
                        </motion.div>
                      ))}
                    </div>

                    {/* Bar chart */}
                    {data.breakdown.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.35 }}
                        className="w-full max-w-[520px] h-[130px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.breakdown} barCategoryGap="20%">
                            <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v)} />
                            <Tooltip
                              contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11 }}
                              labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                              formatter={(v: number) => fmt(v)}
                            />
                            {ACTIVITIES.map((a) => (
                              <Bar key={a.key} dataKey={a.key} fill={a.barColor} radius={[4, 4, 0, 0]} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </motion.div>
                    )}

                    {/* Total summary */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10"
                    >
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-bold text-white/70">
                        Total: <span className="text-white">{fmt(data.totalSeconds)}</span>
                        <span className="text-white/30"> / {fmt(data.totalTarget)}</span>
                      </span>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Right: Leaderboard */}
            <div className="w-[220px] shrink-0 flex flex-col rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Class Ranking</span>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2 space-y-1">
                {lbLoading ? (
                  <div className="text-white/30 text-[11px] text-center py-4 animate-pulse">Loading…</div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-white/30 text-[11px] text-center py-4">No class data</div>
                ) : (
                  <AnimatePresence>
                    {leaderboard.map((entry, i) => {
                      const isMe = entry.user_id === user?.id;
                      return (
                        <motion.div
                          key={entry.user_id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.25 }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                            isMe ? "bg-white/10 border border-white/15" : "hover:bg-white/5"
                          }`}
                        >
                          {/* Rank badge */}
                          <div className="w-6 shrink-0 flex justify-center">
                            {entry.rank === 1 ? (
                              <Crown className="w-4 h-4 text-yellow-400" />
                            ) : entry.rank === 2 ? (
                              <Medal className="w-4 h-4 text-gray-300" />
                            ) : entry.rank === 3 ? (
                              <Medal className="w-4 h-4 text-amber-600" />
                            ) : (
                              <span className="text-[11px] font-bold text-white/30">{entry.rank}</span>
                            )}
                          </div>
                          {/* Avatar */}
                          <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                            {entry.avatar_url ? (
                              <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold text-white/40">
                                {entry.display_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {/* Name & time */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-[11px] font-semibold truncate ${isMe ? "text-white" : "text-white/60"}`}>
                              {entry.display_name}
                              {isMe && <span className="text-[9px] ml-1 text-white/30">(you)</span>}
                            </div>
                            <div className="text-[10px] text-white/30 font-medium">{fmt(entry.total_seconds)}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
