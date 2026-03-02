import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, BookOpen, BarChart3, MessageSquare, LogOut, TrendingUp, Clock, Activity, Trash2, UserMinus, ChevronDown, ChevronUp, AlertTriangle, CalendarIcon } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { SEMESTER_START, SEMESTER_WEEKS } from "@/lib/semester";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ROLES = ["student", "teacher", "parent", "admin"] as const;

async function adminAction(action: string, params: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("admin-manage-users", {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

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

type DatePreset = "7d" | "30d" | "semester" | "custom";

function AnalyticsPanel() {
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range state
  const semesterStartDate = new Date(`${SEMESTER_START}T00:00:00`);
  const [preset, setPreset] = useState<DatePreset>("semester");
  const [dateFrom, setDateFrom] = useState<Date>(semesterStartDate);
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const applyPreset = useCallback((p: DatePreset) => {
    setPreset(p);
    const now = new Date();
    if (p === "7d") {
      setDateFrom(startOfDay(subDays(now, 7)));
      setDateTo(endOfDay(now));
    } else if (p === "30d") {
      setDateFrom(startOfDay(subDays(now, 30)));
      setDateTo(endOfDay(now));
    } else if (p === "semester") {
      setDateFrom(semesterStartDate);
      setDateTo(endOfDay(now));
    }
    // "custom" keeps current values
  }, []);

  useEffect(() => {
    (async () => {
      const { data: logData } = await supabase
        .from("student_practice_logs")
        .select("user_id, activity_type, course_type, week_number, active_seconds, created_at")
        .order("created_at", { ascending: true });

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, created_at");

      setAllLogs(logData ?? []);
      setProfiles(profileData ?? []);
      setLoading(false);
    })();
  }, []);

  // Filter logs by date range
  const logs = useMemo(() => {
    const from = dateFrom.getTime();
    const to = endOfDay(dateTo).getTime();
    return allLogs.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= from && t <= to;
    });
  }, [allLogs, dateFrom, dateTo]);

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
    const growthMap = new Map<number, number>();
    for (let w = 1; w <= SEMESTER_WEEKS; w++) growthMap.set(w, 0);
    for (const p of profiles) {
      const d = new Date(p.created_at);
      const diff = d.getTime() - semesterStartDate.getTime();
      if (diff < 0) {
        growthMap.set(1, (growthMap.get(1) || 0) + 1);
      } else {
        const wk = Math.min(Math.floor(diff / (7 * 86400000)) + 1, SEMESTER_WEEKS);
        growthMap.set(wk, (growthMap.get(wk) || 0) + 1);
      }
    }
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

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.round((secs % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const presets: { id: DatePreset; label: string }[] = [
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "semester", label: "Semester" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
        <div className="flex items-center gap-1">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                preset === p.id
                  ? "bg-amber-500/15 border border-amber-400/20 text-amber-300"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date pickers — always visible to show active range */}
        <div className="flex items-center gap-2">
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] text-gray-300 hover:bg-white/[0.06] transition-all">
                <CalendarIcon className="w-3 h-3 text-gray-500" />
                {format(dateFrom, "MMM d, yyyy")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-white/10" align="start" side="bottom">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(d) => { if (d) { setDateFrom(d); setPreset("custom"); } setFromOpen(false); }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-[10px] text-gray-600">→</span>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] text-gray-300 hover:bg-white/[0.06] transition-all">
                <CalendarIcon className="w-3 h-3 text-gray-500" />
                {format(dateTo, "MMM d, yyyy")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-white/10" align="end" side="bottom">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(d) => { if (d) { setDateTo(d); setPreset("custom"); } setToOpen(false); }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <p className="text-[9px] text-gray-600 text-center">
          {logs.length} sessions in range · {allLogs.length} total
        </p>
      </div>

      {!stats ? (
        <p className="text-xs text-gray-500 text-center py-4">No data in selected range</p>
      ) : (
        <>
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
        </>
      )}
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
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, created_at");
    const merged = (profiles ?? []).map((p) => ({
      ...p,
      role: roles?.find((r) => r.user_id === p.id)?.role ?? "unknown",
    }));
    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setBusy(true);
    try {
      await adminAction("change_role", { user_id: userId, new_role: newRole });
      toast({ title: "Role updated" });
      setChangingRole(null);
      await loadUsers();
    } catch (err: any) {
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    }
    setBusy(false);
  };

  const handleDelete = async (userId: string) => {
    setBusy(true);
    try {
      await adminAction("delete_user", { user_id: userId });
      toast({ title: "User deleted" });
      setConfirmDelete(null);
      await loadUsers();
    } catch (err: any) {
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    }
    setBusy(false);
  };

  if (loading) return <LoadingSpinner />;

  const roleColors: Record<string, string> = {
    student: "bg-blue-500/15 text-blue-300 border-blue-400/20",
    teacher: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
    parent: "bg-rose-500/15 text-rose-300 border-rose-400/20",
    admin: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  };

  const isSelf = (uid: string) => uid === currentUser?.id;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{users.length} Users</p>
      {users.map((u) => (
        <div key={u.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
              {(u.display_name || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">{u.display_name || "No Name"}</p>
              <p className="text-[10px] text-gray-500">{new Date(u.created_at).toLocaleDateString()}</p>
            </div>

            {/* Role selector */}
            {changingRole === u.id ? (
              <div className="flex gap-1">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    disabled={busy || r === u.role}
                    onClick={() => handleRoleChange(u.id, r)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border transition-all ${
                      r === u.role
                        ? roleColors[r] + " opacity-50"
                        : "bg-white/[0.04] border-white/[0.1] text-gray-400 hover:text-white hover:bg-white/[0.08]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button onClick={() => setChangingRole(null)} className="text-[10px] text-gray-500 hover:text-gray-300 px-1">✕</button>
              </div>
            ) : (
              <button
                onClick={() => !isSelf(u.id) && setChangingRole(u.id)}
                disabled={isSelf(u.id)}
                className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border transition-all ${
                  roleColors[u.role] || "bg-gray-500/15 text-gray-400 border-gray-400/20"
                } ${isSelf(u.id) ? "opacity-50 cursor-default" : "hover:scale-105 cursor-pointer"}`}
                title={isSelf(u.id) ? "Can't change own role" : "Click to change role"}
              >
                {u.role}
              </button>
            )}

            {/* Delete button */}
            {!isSelf(u.id) && (
              <button
                onClick={() => setConfirmDelete(u.id)}
                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete user"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Delete confirmation */}
          <AnimatePresence>
            {confirmDelete === u.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-[10px] text-red-300 flex-1">Permanently delete <strong>{u.display_name}</strong>?</p>
                <button
                  disabled={busy}
                  onClick={() => handleDelete(u.id)}
                  className="px-2 py-1 rounded text-[9px] font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50"
                >
                  {busy ? "…" : "Delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="text-[10px] text-gray-500 hover:text-gray-300 px-1"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/* ── Classes Panel ───────────────────────────────────────── */
function ClassesPanel() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
      setClasses(data ?? []);
      setLoading(false);
    })();
  }, []);

  const toggleExpand = async (classId: string) => {
    if (expandedClass === classId) {
      setExpandedClass(null);
      return;
    }
    setExpandedClass(classId);
    setMembersLoading(true);
    try {
      const data = await adminAction("list_members", { class_id: classId });
      setMembers(data.members ?? []);
    } catch {
      setMembers([]);
    }
    setMembersLoading(false);
  };

  const removeMember = async (classId: string, userId: string) => {
    setBusy(true);
    try {
      await adminAction("remove_member", { class_id: classId, user_id: userId });
      toast({ title: "Member removed" });
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err: any) {
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    }
    setBusy(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{classes.length} Classes</p>
      {classes.map((c) => (
        <div key={c.id} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          <button
            onClick={() => toggleExpand(c.id)}
            className="w-full p-3 flex items-center gap-2 hover:bg-white/[0.02] transition-all text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-gray-200">{c.name}</h3>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                  c.course_type === "igcse" ? "bg-amber-500/15 text-amber-300 border border-amber-400/20" : "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20"
                }`}>{c.course_type}</span>
              </div>
              <code className="text-[10px] text-blue-300/60 font-mono">{c.join_code}</code>
            </div>
            {expandedClass === c.id ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>

          <AnimatePresence>
            {expandedClass === c.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-white/[0.06]"
              >
                <div className="p-3 space-y-1.5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Members</p>
                  {membersLoading ? (
                    <div className="py-2 flex justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    </div>
                  ) : members.length === 0 ? (
                    <p className="text-[10px] text-gray-500 py-2">No members</p>
                  ) : (
                    members.map((m) => (
                      <div key={m.user_id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                        <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                          {(m.display_name || "?")[0].toUpperCase()}
                        </div>
                        <p className="text-[10px] text-gray-300 flex-1 truncate">{m.display_name}</p>
                        <p className="text-[9px] text-gray-600">{new Date(m.joined_at).toLocaleDateString()}</p>
                        <button
                          disabled={busy}
                          onClick={() => removeMember(c.id, m.user_id)}
                          className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                          title="Remove from class"
                        >
                          <UserMinus className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
