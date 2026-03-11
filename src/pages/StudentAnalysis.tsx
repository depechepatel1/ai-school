import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ArrowLeft, BarChart3, Zap, Trophy, Crown, Medal, Clock, TrendingUp, Award } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/lib/auth";
import { useCourseWeek } from "@/hooks/useCourseWeek";
import { useAnalyticsData, type Period, type ActivityData } from "@/hooks/useAnalyticsData";
import { useClassLeaderboard } from "@/hooks/useClassLeaderboard";
import { useExtendedLeaderboard } from "@/hooks/useExtendedLeaderboard";
import { useStudentReport } from "@/hooks/useStudentReport";
import { getWeekNumber, getWeekDateRange, SEMESTER_WEEKS, SEMESTER_START } from "@/lib/semester";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANALYSIS_VIDEO = `${SUPABASE_URL}/storage/v1/object/public/videos/analysis-bg.mp4?v=2`;

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

function fmtHM(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ProgressRing({ data, color, label, size = 120 }: { data: ActivityData; color: string; label: string; size?: number }) {
  const stroke = size >= 100 ? 8 : 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = data.pct;
  const offset = circ * (1 - pct);
  const isOvertime = data.overtime > 0;

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" strokeOpacity={0.08} strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${size >= 100 ? 'text-2xl' : 'text-lg'} font-bold text-white`}>{Math.round(pct * 100)}%</span>
          {isOvertime && (
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
              +{fmt(data.overtime)}
            </span>
          )}
        </div>
      </div>
      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/70">{label}</span>
      <span className="text-[10px] sm:text-[11px] text-white/40 font-medium">{fmt(data.seconds)} / {fmt(data.target)}</span>
    </div>
  );
}

type RightPanel = "class" | "extended" | "report";

export default function StudentAnalysis() {
  usePageTitle("Analytics");
  const { user } = useAuth();
  const { courseType } = useCourseWeek(user?.id ?? null);
  const [period, setPeriod] = useState<Period>("daily");
  const [rightPanel, setRightPanel] = useState<RightPanel>("class");
  const { data, loading } = useAnalyticsData(user?.id ?? null, courseType, period);
  const navigate = useNavigate();
  const weekNum = getWeekNumber();

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
  const { entries: extLeaderboard, loading: extLoading } = useExtendedLeaderboard(user?.id ?? null, rangeStart, rangeEnd);
  const { report, loading: reportLoading } = useStudentReport(user?.id ?? null, courseType);

  const rightTabs: { key: RightPanel; label: string; icon: React.ReactNode }[] = [
    { key: "class", label: "Class", icon: <Trophy className="w-3 h-3" /> },
    { key: "extended", label: "Extended", icon: <TrendingUp className="w-3 h-3" /> },
    { key: "report", label: "Report", icon: <BarChart3 className="w-3 h-3" /> },
  ];

  return (
    <PageShell fullWidth loopVideos={[ANALYSIS_VIDEO]} hideFooter>
        <div className="absolute inset-2 sm:inset-4 z-10 flex items-center justify-center">
        <div className="relative w-full h-full sm:max-w-[960px] sm:max-h-[700px] rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-2 sm:pb-3">
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
          <div className="relative z-10 flex items-center gap-1 px-4 sm:px-6 pb-3 sm:pb-4 overflow-x-auto scrollbar-hide">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`relative px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  period === p.key ? "text-white" : "text-white/40 hover:text-white/60"
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
          <div className="relative z-10 flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 px-4 sm:px-6 pb-4 overflow-hidden">
            {/* Left: Analytics */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-5 overflow-y-auto min-h-0">
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
                    <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                      {ACTIVITIES.map((a, i) => (
                        <motion.div
                          key={a.key}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.08, duration: 0.35, ease: "easeOut" }}
                        >
                          <ProgressRing data={data[a.key]} color={a.color} label={a.label} size={window.innerWidth < 640 ? 80 : 120} />
                        </motion.div>
                      ))}
                    </div>

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

            {/* Right panel */}
            <div className="w-full md:w-[240px] shrink-0 flex flex-col rounded-2xl bg-white/5 border border-white/10 overflow-hidden max-h-[300px] md:max-h-none">
              {/* Right panel tabs */}
              <div className="flex border-b border-white/10">
                {rightTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setRightPanel(t.key)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                      rightPanel === t.key
                        ? "text-yellow-300 bg-white/5"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {rightPanel === "class" && (
                  <ClassLeaderboardPanel entries={leaderboard} loading={lbLoading} currentUserId={user?.id} />
                )}
                {rightPanel === "extended" && (
                  <ExtendedLeaderboardPanel entries={extLeaderboard} loading={extLoading} currentUserId={user?.id} />
                )}
                {rightPanel === "report" && (
                  <ReportPanel report={report} loading={reportLoading} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* ── Class Leaderboard Panel ───────────────────── */
function ClassLeaderboardPanel({ entries, loading, currentUserId }: { entries: any[]; loading: boolean; currentUserId?: string }) {
  if (loading) return <div className="text-white/30 text-[11px] text-center py-4 animate-pulse">Loading…</div>;
  if (entries.length === 0) return <EmptyState icon={<Trophy className="w-5 h-5" />} title="No class data" description="Practice to see your class ranking" className="py-6" />;

  return (
    <div className="px-2 py-2 space-y-1">
      <AnimatePresence>
        {entries.map((entry, i) => {
          const isMe = entry.user_id === currentUserId;
          return (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isMe ? "bg-white/10 border border-white/15" : "hover:bg-white/5"}`}
            >
              <RankBadge rank={entry.rank} />
              <Avatar name={entry.display_name} url={entry.avatar_url} />
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
    </div>
  );
}

/* ── Extended Practice Leaderboard ────────────── */
function ExtendedLeaderboardPanel({ entries, loading, currentUserId }: { entries: any[]; loading: boolean; currentUserId?: string }) {
  if (loading) return <div className="text-white/30 text-[11px] text-center py-4 animate-pulse">Loading…</div>;
  if (entries.length === 0) return <EmptyState icon={<Zap className="w-5 h-5" />} title="No extended practice data" description="Go beyond homework targets to appear here" className="py-6" />;

  const maxSeconds = Math.max(...entries.map((e) => e.extended_seconds), 1);

  return (
    <div className="px-2 py-2 space-y-1">
      {/* Podium for top 3 */}
      {entries.length >= 3 && (
        <div className="flex items-end justify-center gap-2 py-3 mb-2">
          {[entries[1], entries[0], entries[2]].map((e, podiumIdx) => {
            const heights = [52, 68, 40];
            const colors = ["bg-gray-400/20 border-gray-400/30", "bg-yellow-400/20 border-yellow-400/30", "bg-amber-700/20 border-amber-700/30"];
            const textColors = ["text-gray-300", "text-yellow-300", "text-amber-500"];
            const isMe = e.user_id === currentUserId;
            return (
              <div key={e.user_id} className="flex flex-col items-center gap-1">
                <Avatar name={e.display_name} url={e.avatar_url} size={podiumIdx === 1 ? 28 : 22} />
                <span className={`text-[8px] font-bold truncate max-w-[50px] ${isMe ? "text-white" : "text-white/50"}`}>
                  {e.display_name.split(" ")[0]}
                </span>
                <div
                  className={`w-12 rounded-t-lg border ${colors[podiumIdx]} flex items-center justify-center`}
                  style={{ height: heights[podiumIdx] }}
                >
                  <span className={`text-[10px] font-black ${textColors[podiumIdx]}`}>{fmtHM(e.extended_seconds)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {entries.map((entry, i) => {
          const isMe = entry.user_id === currentUserId;
          const barWidth = maxSeconds > 0 ? (entry.extended_seconds / maxSeconds) * 100 : 0;
          return (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isMe ? "bg-white/10 border border-white/15" : "hover:bg-white/5"}`}
            >
              <RankBadge rank={entry.rank} />
              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-semibold truncate ${isMe ? "text-white" : "text-white/60"}`}>
                  {entry.display_name}
                  {isMe && <span className="text-[9px] ml-1 text-white/30">(you)</span>}
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="text-[10px] text-white/30 font-medium mt-0.5">{fmtHM(entry.extended_seconds)}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ── Student Report Panel ─────────────────────── */
function ReportPanel({ report, loading }: { report: any; loading: boolean }) {
  if (loading) return <div className="text-white/30 text-[11px] text-center py-4 animate-pulse">Loading…</div>;
  if (!report) return <div className="text-white/30 text-[11px] text-center py-4">No report data</div>;

  return (
    <div className="px-3 py-3 space-y-4">
      {/* This Week Homework */}
      <div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-2">This Week · Homework</span>
        {(["shadowing", "pronunciation", "speaking"] as const).map((mod) => (
          <div key={mod} className="flex items-center justify-between py-1.5 border-b border-white/[0.05] last:border-0">
            <span className="text-[11px] text-white/60 capitalize">{mod}</span>
            <span className="text-[11px] font-bold text-white/80">{fmtHM(report.homework[mod])}</span>
          </div>
        ))}
      </div>

      {/* Extended Practice */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Extended</span>
        </div>
        <span className="text-sm font-bold text-emerald-200">{fmtHM(report.extendedTotal)}</span>
      </div>

      {/* Leaderboard Position */}
      {report.leaderboardRank > 0 && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-wider">Rank</span>
          </div>
          <span className="text-sm font-bold text-yellow-200">#{report.leaderboardRank}</span>
        </div>
      )}

      {/* 4-Week Chart */}
      <div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block mb-2">Past 4 Weeks</span>
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.weeklyChart} barCategoryGap="25%">
              <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtHM(v)} />
              <Tooltip
                contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 10 }}
                formatter={(v: number) => fmtHM(v)}
              />
              <Bar dataKey="homework" fill="#22d3ee" radius={[3, 3, 0, 0]} name="Homework" />
              <Bar dataKey="extended" fill="#10b981" radius={[3, 3, 0, 0]} name="Extended" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ── Shared Components ────────────────────────── */
function RankBadge({ rank }: { rank: number }) {
  return (
    <div className="w-6 shrink-0 flex justify-center">
      {rank === 1 ? (
        <Crown className="w-4 h-4 text-yellow-400" />
      ) : rank === 2 ? (
        <Medal className="w-4 h-4 text-gray-300" />
      ) : rank === 3 ? (
        <Medal className="w-4 h-4 text-amber-600" />
      ) : (
        <span className="text-[11px] font-bold text-white/30">{rank}</span>
      )}
    </div>
  );
}

function Avatar({ name, url, size = 24 }: { name: string; url?: string | null; size?: number }) {
  return (
    <div
      className="rounded-full bg-white/10 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[9px] font-bold text-white/40">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
