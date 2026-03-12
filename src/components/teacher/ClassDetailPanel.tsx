import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getWeekNumber, getWeekDateRange, TIME_TARGETS, SCHOOL_DAYS_PER_WEEK } from "@/lib/semester";
import { useLanguage } from "@/lib/i18n";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Clock, TrendingUp, Flame, ChevronLeft, ChevronRight, Download, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import StudentTranscriptPanel from "./StudentTranscriptPanel";

interface StudentEngagement {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  shadowing_seconds: number;
  pronunciation_seconds: number;
  speaking_seconds: number;
  total_seconds: number;
  session_count: number;
  last_active: string | null;
}

interface ClassDetailPanelProps {
  classId: string;
  className: string;
  courseType: string;
  onBack: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ClassDetailPanel({ classId, className, courseType, onBack }: ClassDetailPanelProps) {
  const [students, setStudents] = useState<StudentEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewingTranscript, setViewingTranscript] = useState<{ id: string; name: string } | null>(null);
  const { t } = useLanguage();

  const currentWeek = getWeekNumber();
  const viewWeek = Math.max(1, currentWeek + weekOffset);
  const range = getWeekDateRange(viewWeek);
  const targets = TIME_TARGETS[courseType] ?? TIME_TARGETS.igcse;
  const weeklyTarget = (targets.shadowing + targets.pronunciation + targets.speaking) * SCHOOL_DAYS_PER_WEEK;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_class_engagement", {
        _class_id: classId,
        _range_start: range.start.toISOString(),
        _range_end: range.end.toISOString(),
      });
      setStudents((data as StudentEngagement[] | null) ?? []);
      setLoading(false);
    };
    load();
  }, [classId, viewWeek]);

  const stats = useMemo(() => {
    if (!students.length) return { avg: 0, active: 0, total: students.length, topActivity: "—" };
    const active = students.filter((s) => s.total_seconds > 0).length;
    const avg = students.reduce((a, s) => a + s.total_seconds, 0) / students.length;
    const sums = { shadowing: 0, pronunciation: 0, speaking: 0 };
    students.forEach((s) => {
      sums.shadowing += s.shadowing_seconds;
      sums.pronunciation += s.pronunciation_seconds;
      sums.speaking += s.speaking_seconds;
    });
    const topActivity = Object.entries(sums).sort((a, b) => b[1] - a[1])[0][0];
    return { avg, active, total: students.length, topActivity };
  }, [students]);

  const chartData = useMemo(() =>
    students.map((s) => ({
      name: (s.display_name ?? "Student").split(" ")[0].slice(0, 8),
      total: Math.round(s.total_seconds / 60),
      pct: weeklyTarget > 0 ? Math.min(s.total_seconds / weeklyTarget, 1) : 0,
    })), [students, weeklyTarget]);

  const exportCSV = () => {
    if (!students.length) return;
    const header = "Student,Shadowing (min),Pronunciation (min),Speaking (min),Total (min),Sessions,Last Active";
    const rows = students.map((s) =>
      `"${s.display_name}",${Math.round(s.shadowing_seconds / 60)},${Math.round(s.pronunciation_seconds / 60)},${Math.round(s.speaking_seconds / 60)},${Math.round(s.total_seconds / 60)},${s.session_count},${s.last_active ? new Date(s.last_active).toLocaleDateString() : "Never"}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${className.replace(/\s+/g, "_")}_week${viewWeek}_engagement.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (viewingTranscript) {
    return (
      <StudentTranscriptPanel
        studentId={viewingTranscript.id}
        studentName={viewingTranscript.name}
        onBack={() => setViewingTranscript(null)}
      />
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }} className="flex-1 flex flex-col">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] transition-all text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-200 truncate">{className}</h2>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            courseType === "igcse" ? "bg-amber-500/15 text-amber-300 border border-amber-400/20" : "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20"
          }`}>{courseType}</span>
        </div>
        {/* Week Selector inline */}
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((o) => o - 1)} disabled={viewWeek <= 1}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-gray-300 tabular-nums min-w-[70px] text-center">
            Week {viewWeek}
          </span>
          <button onClick={() => setWeekOffset((o) => o + 1)} disabled={viewWeek >= currentWeek}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {/* CSV Export */}
        {students.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
            title="Export as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        )}
      </motion.div>

      {/* Summary cards + Chart side by side */}
      <motion.div variants={fadeUp} className="flex gap-4 mb-5">
        {/* Summary cards column */}
        <div className="flex flex-col gap-2 w-48 shrink-0">
          {[
            { icon: <Users className="w-3.5 h-3.5" />, label: "Active", value: `${stats.active}/${stats.total}`, color: "text-emerald-300" },
            { icon: <Clock className="w-3.5 h-3.5" />, label: "Avg Time", value: formatTime(Math.round(stats.avg)), color: "text-teal-300" },
            { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Top", value: stats.topActivity, color: "text-purple-300" },
          ].map((c, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center space-y-1">
              <div className={`mx-auto w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center ${c.color}`}>{c.icon}</div>
              <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Bar Chart — fills remaining space */}
        {chartData.length > 0 && (
          <div className="flex-1 rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">Practice Minutes</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barCategoryGap="20%">
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`${v} min`, "Practice"]}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.pct >= 0.8 ? "#34d399" : entry.pct >= 0.4 ? "#fbbf24" : "#f87171"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Student List — takes remaining space */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1.5">
        {loading && <p className="text-center text-xs text-gray-600 py-8">Loading…</p>}
        {!loading && students.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-5 h-5 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No students in this class yet</p>
          </div>
        )}
        {students.map((s) => {
          const pct = weeklyTarget > 0 ? Math.min(s.total_seconds / weeklyTarget, 1) : 0;
          return (
            <motion.div key={s.user_id} variants={fadeUp}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-[11px] font-bold text-gray-300 shrink-0 overflow-hidden">
                {s.avatar_url
                  ? <img src={s.avatar_url} className="w-full h-full object-cover" />
                  : (s.display_name ?? "S")[0].toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-200 truncate">{s.display_name}</span>
                  {pct >= 1 && <Flame className="w-3 h-3 text-orange-400" />}
                </div>
                {/* Progress bar */}
                <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden max-w-xs">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(pct * 100)}%`,
                      background: pct >= 0.8 ? "#34d399" : pct >= 0.4 ? "#fbbf24" : "#f87171",
                    }} />
                </div>
              </div>
              {/* Stats */}
              <span className="text-[10px] text-gray-400 tabular-nums">{formatTime(s.total_seconds)} / {formatTime(weeklyTarget)}</span>
              <span className="text-[10px] text-gray-600 tabular-nums">{s.session_count} sessions</span>
              <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(s.last_active)}</span>
              {/* View transcripts button */}
              <button
                onClick={() => setViewingTranscript({ id: s.user_id, name: s.display_name })}
                className="p-1.5 rounded-lg text-gray-600 hover:text-teal-300 hover:bg-teal-500/10 transition-all"
                title="View AI chat transcripts"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
