import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Shield, Users, BookOpen, BarChart3, MessageSquare, LogOut, TrendingUp, Clock, Activity } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { SEMESTER_START, SEMESTER_WEEKS } from "@/lib/semester";

type Tab = "analytics" | "users" | "classes" | "practice" | "conversations";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("analytics");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "analytics", label: "Analytics", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "users", label: "Users", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "classes", label: "Classes", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "practice", label: "Logs", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "conversations", label: "Chat", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  return (
    <PageShell>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        className="flex-1 flex flex-col"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <NeuralLogo />
            <div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-amber-300 leading-tight">
                Neural Admin
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/20 text-[9px] font-semibold text-amber-300">
                <Shield className="w-3 h-3" /> Administrator
              </span>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fadeUp} className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-amber-500/15 border border-amber-400/20 text-amber-300"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {activeTab === "analytics" && <AnalyticsPanel />}
          {activeTab === "users" && <UsersPanel />}
          {activeTab === "classes" && <ClassesPanel />}
          {activeTab === "practice" && <PracticePanel />}
          {activeTab === "conversations" && <ConversationsPanel />}
        </div>
      </motion.div>
    </PageShell>
  );
}

/* ── Analytics Panel ─────────────────────────────────────── */

const ACTIVITY_COLORS: Record<string, string> = {
  shadowing: "#22d3ee",   // cyan
  pronunciation: "#f97316", // orange
  speaking: "#a855f7",     // purple
};

const PIE_COLORS = ["#22d3ee", "#f97316", "#a855f7"];

function AnalyticsPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Fetch all practice logs (up to 1000)
      const { data: logData } = await supabase
        .from("student_practice_logs")
        .select("user_id, activity_type, course_type, week_number, active_seconds, created_at")
        .order("created_at", { ascending: true });

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, created_at");

      setLogs(logData ?? []);
      setProfiles(profileData ?? []);
      setLoading(false);
    })();
  }, []);

  // ── Derived data ──
  const stats = useMemo(() => {
    if (!logs.length) return null;

    const totalSeconds = logs.reduce((s, l) => s + (l.active_seconds || 0), 0);
    const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;
    const totalSessions = logs.length;

    // Weekly practice time (bar chart)
    const weeklyMap = new Map<number, number>();
    for (let w = 1; w <= SEMESTER_WEEKS; w++) weeklyMap.set(w, 0);
    for (const l of logs) {
      const wk = l.week_number || 1;
      weeklyMap.set(wk, (weeklyMap.get(wk) || 0) + (l.active_seconds || 0));
    }
    const weeklyData = Array.from(weeklyMap.entries()).map(([week, seconds]) => ({
      week: `W${week}`,
      minutes: Math.round(seconds / 60),
    }));

    // Active users per week
    const weeklyUsersMap = new Map<number, Set<string>>();
    for (let w = 1; w <= SEMESTER_WEEKS; w++) weeklyUsersMap.set(w, new Set());
    for (const l of logs) {
      const wk = l.week_number || 1;
      weeklyUsersMap.get(wk)?.add(l.user_id);
    }
    const weeklyUsersData = Array.from(weeklyUsersMap.entries()).map(([week, users]) => ({
      week: `W${week}`,
      users: users.size,
    }));

    // Activity breakdown (pie)
    const activityMap: Record<string, number> = {};
    for (const l of logs) {
      const type = l.activity_type || "unknown";
      activityMap[type] = (activityMap[type] || 0) + (l.active_seconds || 0);
    }
    const activityData = Object.entries(activityMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round(value / 60),
      key: name,
    }));

    // User growth (cumulative signups by week)
    const semesterStart = new Date(`${SEMESTER_START}T00:00:00`);
    const growthMap = new Map<number, number>();
    for (let w = 1; w <= SEMESTER_WEEKS; w++) growthMap.set(w, 0);
    for (const p of profiles) {
      const d = new Date(p.created_at);
      const diff = d.getTime() - semesterStart.getTime();
      if (diff < 0) {
        // Pre-semester signup, count to week 1
        growthMap.set(1, (growthMap.get(1) || 0) + 1);
      } else {
        const wk = Math.min(Math.floor(diff / (7 * 86400000)) + 1, SEMESTER_WEEKS);
        growthMap.set(wk, (growthMap.get(wk) || 0) + 1);
      }
    }
    // Make cumulative
    let cum = 0;
    const growthData = Array.from(growthMap.entries()).map(([week, count]) => {
      cum += count;
      return { week: `W${week}`, total: cum };
    });

    // Course split
    const courseMap: Record<string, number> = {};
    for (const l of logs) {
      const ct = l.course_type || "unknown";
      courseMap[ct] = (courseMap[ct] || 0) + (l.active_seconds || 0);
    }

    return {
      totalSeconds,
      uniqueUsers,
      totalSessions,
      weeklyData,
      weeklyUsersData,
      activityData,
      growthData,
      courseMap,
    };
  }, [logs, profiles]);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <p className="text-xs text-gray-500 text-center py-4">No data yet</p>;

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.round((secs % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard icon={<Clock className="w-4 h-4" />} label="Total Practice" value={formatTime(stats.totalSeconds)} color="text-cyan-300" />
        <KpiCard icon={<Users className="w-4 h-4" />} label="Active Students" value={String(stats.uniqueUsers)} color="text-emerald-300" />
        <KpiCard icon={<Activity className="w-4 h-4" />} label="Sessions" value={String(stats.totalSessions)} color="text-amber-300" />
      </div>

      {/* Weekly Practice Time */}
      <ChartCard title="Weekly Practice Time (min)">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={stats.weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="week" tick={{ fontSize: 8, fill: "#6b7280" }} interval={3} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Bar dataKey="minutes" fill="#22d3ee" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Active Users Per Week */}
      <ChartCard title="Active Users Per Week">
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={stats.weeklyUsersData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="week" tick={{ fontSize: 8, fill: "#6b7280" }} interval={3} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }}
            />
            <Area type="monotone" dataKey="users" stroke="#10b981" fill="url(#userGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Activity Breakdown + User Growth side by side */}
      <div className="grid grid-cols-2 gap-2">
        <ChartCard title="Activity Split">
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie
                data={stats.activityData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={42}
                paddingAngle={3}
                dataKey="value"
              >
                {stats.activityData.map((entry, i) => (
                  <Cell key={entry.key} fill={ACTIVITY_COLORS[entry.key] || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }}
                formatter={(v: number) => `${v}m`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 -mt-1">
            {stats.activityData.map((a) => (
              <span key={a.key} className="flex items-center gap-1 text-[8px] text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ background: ACTIVITY_COLORS[a.key] || "#888" }} />
                {a.name}
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="User Growth">
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={stats.growthData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 7, fill: "#6b7280" }} interval={4} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 7, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }}
              />
              <Area type="monotone" dataKey="total" stroke="#f59e0b" fill="url(#growthGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Course Split */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(stats.courseMap).map(([course, seconds]) => (
          <div key={course} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${
              course === "igcse" ? "text-amber-300" : "text-cyan-300"
            }`}>{course}</span>
            <p className="text-sm font-bold text-white/80 mt-0.5">{formatTime(seconds)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── KPI Card ────────────────────────────────────────────── */
function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center gap-1">
      <div className={`${color}`}>{icon}</div>
      <p className="text-sm font-bold text-white/90">{value}</p>
      <p className="text-[8px] text-gray-500 uppercase tracking-wider font-bold">{label}</p>
    </div>
  );
}

/* ── Chart Card ──────────────────────────────────────────── */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">{title}</p>
      {children}
    </div>
  );
}

/* ── Users Panel ─────────────────────────────────────────── */
function UsersPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, created_at");
      const merged = (profiles ?? []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role ?? "unknown",
      }));
      setUsers(merged);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const roleColors: Record<string, string> = {
    student: "bg-blue-500/15 text-blue-300 border-blue-400/20",
    teacher: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
    parent: "bg-rose-500/15 text-rose-300 border-rose-400/20",
    admin: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{users.length} Users</p>
      {users.map((u) => (
        <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-gray-400">
            {(u.display_name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate">{u.display_name || "No Name"}</p>
            <p className="text-[10px] text-gray-500">{new Date(u.created_at).toLocaleDateString()}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${roleColors[u.role] || "bg-gray-500/15 text-gray-400 border-gray-400/20"}`}>
            {u.role}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Classes Panel ───────────────────────────────────────── */
function ClassesPanel() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
      setClasses(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{classes.length} Classes</p>
      {classes.map((c) => (
        <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-gray-200">{c.name}</h3>
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
              c.course_type === "igcse" ? "bg-amber-500/15 text-amber-300 border border-amber-400/20" : "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20"
            }`}>{c.course_type}</span>
          </div>
          <code className="block px-2 py-1 bg-white/[0.04] rounded text-[10px] text-blue-300 font-mono">{c.join_code}</code>
        </div>
      ))}
    </div>
  );
}

/* ── Practice Logs Panel ─────────────────────────────────── */
function PracticePanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("student_practice_logs")
        .select("id, user_id, activity_type, course_type, week_number, active_seconds, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Recent Practice ({logs.length})</p>
      {logs.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No practice logs yet</p>}
      {logs.map((l) => (
        <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-300">
              {l.activity_type} · Wk {l.week_number} · {l.course_type}
            </p>
            <p className="text-[10px] text-gray-500">{new Date(l.created_at).toLocaleString()}</p>
          </div>
          <span className="text-xs font-bold text-white/70">{Math.round(l.active_seconds / 60)}m</span>
        </div>
      ))}
    </div>
  );
}

/* ── Conversations Panel ─────────────────────────────────── */
function ConversationsPanel() {
  const [convos, setConvos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, user_id, title, created_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      setConvos(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Recent Conversations ({convos.length})</p>
      {convos.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No conversations yet</p>}
      {convos.map((c) => (
        <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <p className="text-xs font-semibold text-gray-200 truncate">{c.title || "Untitled"}</p>
          <p className="text-[10px] text-gray-500">{new Date(c.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Shared Loading Spinner ──────────────────────────────── */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
    </div>
  );
}
