import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, BookOpen, BarChart3, MessageSquare, LogOut, TrendingUp, Clock, Activity, Trash2, UserMinus, ChevronDown, ChevronUp, AlertTriangle, CalendarIcon, ArrowLeft, Eye, Download, Search, ChevronLeft, ChevronRight, CheckSquare, Square, ClipboardList, Film, Timer, Upload } from "lucide-react";
import NeuralLogo from "@/components/NeuralLogo";
import PageShell from "@/components/PageShell";
import { invokeAdminAction, fetchAllPracticeLogs, fetchAllProfiles, fetchAllUserRolesAndProfiles, fetchAllClasses, fetchUserPracticeLogs, fetchRecentPracticeLogs, fetchRecentConversations, fetchAuditLogs, fetchProfilesByIds } from "@/services/db";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { SEMESTER_START, SEMESTER_WEEKS } from "@/lib/semester";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import AdminTimerSettings from "@/components/admin/AdminTimerSettings";
import AdminCurriculumUpload from "@/components/admin/AdminCurriculumUpload";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DASHBOARD_BG = "/images/dashboard-bg.jpg";

const ROLES = ["student", "teacher", "parent", "admin"] as const;

const ALLOWED_ADMIN_ACTIONS = new Set([
  "list_users", "update_role", "delete_user", "disable_user", "enable_user",
  "list_classes", "delete_class", "get_stats",
]);

async function adminAction(action: string, params: Record<string, any>) {
  if (!ALLOWED_ADMIN_ACTIONS.has(action)) {
    throw new Error(`Unknown admin action: ${action}`);
  }
  return invokeAdminAction(action, params);
}

type Tab = "analytics" | "users" | "classes" | "practice" | "conversations" | "audit" | "timers" | "curriculum";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function AdminDashboard() {
  usePageTitle("Admin Dashboard");
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("analytics");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "analytics", label: "Analytics", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "users", label: "Users", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "classes", label: "Classes", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "practice", label: "Logs", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "conversations", label: "Chat", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "audit", label: "Audit", icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: "timers", label: "Timers", icon: <Timer className="w-3.5 h-3.5" /> },
    { id: "curriculum", label: "Curriculum", icon: <Upload className="w-3.5 h-3.5" /> },
  ];

  return (
    <PageShell fullWidth bgImage={DASHBOARD_BG} hideFooter>
      {/* Full-width glassmorphic overlay */}
      <div className="absolute inset-4 z-10 flex flex-col rounded-[2rem] bg-black/50 backdrop-blur-2xl border border-white/[0.08] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        <div className="relative z-10 flex-1 flex flex-col p-6 min-h-0 overflow-hidden">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <NeuralLogo />
                <div>
                  <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-amber-300 leading-tight">
                    Neural Admin
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/20 text-[9px] font-semibold text-amber-300">
                    <Shield className="w-3 h-3" /> Administrator
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/admin/upload-videos" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
                  <Film className="w-3.5 h-3.5" /> Upload Videos
                </Link>
                <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </motion.div>

            {/* Tabs */}
            <motion.div variants={fadeUp} className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
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
            <div className="flex-1 min-h-0 overflow-y-auto">
              {activeTab === "analytics" && <AnalyticsPanel />}
              {activeTab === "users" && <UsersPanel />}
              {activeTab === "classes" && <ClassesPanel />}
              {activeTab === "practice" && <PracticePanel />}
              {activeTab === "conversations" && <ConversationsPanel />}
              {activeTab === "audit" && <AuditPanel />}
              {activeTab === "timers" && <AdminTimerSettings />}
              {activeTab === "curriculum" && <AdminCurriculumUpload />}
            </div>
          </motion.div>
        </div>
      </div>
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
      const [logData, profileData] = await Promise.all([
        fetchAllPracticeLogs(),
        fetchAllProfiles(),
      ]);
      setAllLogs(logData);
      setProfiles(profileData);
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
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<{ action: "role" | "delete"; role?: string } | null>(null);

  const loadUsers = useCallback(async () => {
    const merged = await fetchAllUserRolesAndProfiles();
    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !searchQuery || (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchQuery, roleFilter]);
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

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkIds = Array.from(checked).filter((id) => id !== currentUser?.id);

  const handleBulkAction = async () => {
    if (!bulkConfirm || !bulkIds.length) return;
    setBusy(true);
    let success = 0;
    let failed = 0;
    for (const uid of bulkIds) {
      try {
        if (bulkConfirm.action === "role" && bulkConfirm.role) {
          await adminAction("change_role", { user_id: uid, new_role: bulkConfirm.role });
        } else if (bulkConfirm.action === "delete") {
          await adminAction("delete_user", { user_id: uid });
        }
        success++;
      } catch {
        failed++;
      }
    }
    toast({
      title: bulkConfirm.action === "delete" ? "Bulk delete complete" : "Bulk role change complete",
      description: `${success} succeeded${failed ? `, ${failed} failed` : ""}`,
    });
    setChecked(new Set());
    setBulkConfirm(null);
    setBusy(false);
    await loadUsers();
  };

  if (loading) return <LoadingSpinner />;

  // Show drill-down if a user is selected
  if (selectedUser) {
    return <StudentDrillDown user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  const roleColors: Record<string, string> = {
    student: "bg-blue-500/15 text-blue-300 border-blue-400/20",
    teacher: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
    parent: "bg-rose-500/15 text-rose-300 border-rose-400/20",
    admin: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  };

  const isSelf = (uid: string) => uid === currentUser?.id;


  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-2">
      {/* Search & Filter Bar */}
      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-200 placeholder:text-gray-600 outline-none focus:border-amber-400/30 transition-all"
          />
        </div>
        <div className="flex gap-1">
          {["all", ...ROLES].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`flex-1 px-1.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all ${
                roleFilter === r
                  ? "bg-amber-500/15 border border-amber-400/20 text-amber-300"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <AnimatePresence>
        {checked.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/20 space-y-2"
          >
            {!bulkConfirm ? (
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-amber-300 font-bold flex-1">{bulkIds.length} selected {checked.size !== bulkIds.length ? `(${checked.size - bulkIds.length} self excluded)` : ""}</p>
                <button
                  onClick={() => setBulkConfirm({ action: "role" })}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-blue-500/15 border border-blue-400/20 text-blue-300 hover:bg-blue-500/25 transition-all"
                >
                  Change Role
                </button>
                <button
                  onClick={() => setBulkConfirm({ action: "delete" })}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-red-500/15 border border-red-400/20 text-red-300 hover:bg-red-500/25 transition-all"
                >
                  Delete
                </button>
                <button
                  onClick={() => setChecked(new Set())}
                  className="text-[10px] text-gray-500 hover:text-gray-300 px-1"
                >
                  Clear
                </button>
              </div>
            ) : bulkConfirm.action === "role" && !bulkConfirm.role ? (
              <div className="space-y-1.5">
                <p className="text-[10px] text-amber-300 font-bold">Set role for {bulkIds.length} users:</p>
                <div className="flex gap-1">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setBulkConfirm({ action: "role", role: r })}
                      className={`flex-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${roleColors[r]} hover:scale-105`}
                    >
                      {r}
                    </button>
                  ))}
                  <button onClick={() => setBulkConfirm(null)} className="text-[10px] text-gray-500 hover:text-gray-300 px-1">✕</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-[10px] text-red-300 flex-1">
                  {bulkConfirm.action === "delete"
                    ? `Permanently delete ${bulkIds.length} user(s)?`
                    : `Change ${bulkIds.length} user(s) to ${bulkConfirm.role}?`}
                </p>
                <button
                  disabled={busy}
                  onClick={handleBulkAction}
                  className="px-2.5 py-1 rounded text-[9px] font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50"
                >
                  {busy ? "…" : "Confirm"}
                </button>
                <button onClick={() => setBulkConfirm(null)} className="text-[10px] text-gray-500 hover:text-gray-300 px-1">Cancel</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Select All for current page */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const pageIds = pagedUsers.filter((u) => !isSelf(u.id)).map((u) => u.id);
            const allChecked = pageIds.every((id) => checked.has(id));
            setChecked((prev) => {
              const next = new Set(prev);
              pageIds.forEach((id) => allChecked ? next.delete(id) : next.add(id));
              return next;
            });
          }}
          className="text-[10px] text-gray-500 hover:text-gray-300 transition-all"
        >
          {pagedUsers.filter((u) => !isSelf(u.id)).every((u) => checked.has(u.id)) && pagedUsers.some((u) => !isSelf(u.id))
            ? <CheckSquare className="w-3.5 h-3.5 inline text-amber-400" />
            : <Square className="w-3.5 h-3.5 inline" />}
        </button>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{filteredUsers.length} of {users.length} Users</p>
      </div>

      {pagedUsers.map((u) => (
        <div key={u.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center gap-3">
            {/* Checkbox */}
            {!isSelf(u.id) ? (
              <button onClick={() => toggleCheck(u.id)} className="shrink-0 text-gray-500 hover:text-amber-400 transition-all">
                {checked.has(u.id) ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-4 shrink-0" />
            )}
            <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
              {(u.display_name || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">{u.display_name || "No Name"}</p>
              <p className="text-[10px] text-gray-500">{new Date(u.created_at).toLocaleDateString()}</p>
            </div>

            {/* View drill-down */}
            <button
              onClick={() => setSelectedUser(u)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
              title="View practice breakdown"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-gray-400 font-bold tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Student Drill-Down ──────────────────────────────────── */
function StudentDrillDown({ user, onBack }: { user: any; onBack: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await fetchUserPracticeLogs(user.id);
      setLogs(data);
      setLoading(false);
    })();
  }, [user.id]);

  const stats = useMemo(() => {
    if (!logs.length) return null;

    const totalSeconds = logs.reduce((s, l) => s + (l.active_seconds || 0), 0);
    const totalSessions = logs.length;

    // Per-activity totals
    const activitySums: Record<string, number> = { shadowing: 0, pronunciation: 0, speaking: 0 };
    for (const l of logs) {
      const a = l.activity_type;
      if (activitySums[a] !== undefined) activitySums[a] += l.active_seconds || 0;
    }

    // Weekly breakdown stacked bar
    const weekMap = new Map<number, Record<string, number>>();
    for (const l of logs) {
      const wk = l.week_number || 1;
      if (!weekMap.has(wk)) weekMap.set(wk, { shadowing: 0, pronunciation: 0, speaking: 0 });
      const bucket = weekMap.get(wk)!;
      const a = l.activity_type;
      if (bucket[a] !== undefined) bucket[a] += l.active_seconds || 0;
    }
    const weeklyData = Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([wk, vals]) => ({
        week: `W${wk}`,
        shadowing: Math.round(vals.shadowing / 60),
        pronunciation: Math.round(vals.pronunciation / 60),
        speaking: Math.round(vals.speaking / 60),
      }));

    // Daily activity heatmap (last 30 days)
    const dailyMap = new Map<string, number>();
    for (const l of logs) {
      const day = new Date(l.created_at).toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + (l.active_seconds || 0));
    }
    const dailyData = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, secs]) => ({ date: date.slice(5), minutes: Math.round(secs / 60) }));

    // Activity pie
    const activityData = Object.entries(activitySums).map(([name, secs]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round(secs / 60),
      key: name,
    }));

    // Course split
    const courseMap: Record<string, number> = {};
    for (const l of logs) {
      const ct = l.course_type || "unknown";
      courseMap[ct] = (courseMap[ct] || 0) + (l.active_seconds || 0);
    }

    // Streak: consecutive days with practice (ending today or yesterday)
    const allDays = Array.from(dailyMap.keys()).sort();
    let streak = 0;
    if (allDays.length) {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const last = allDays[allDays.length - 1];
      if (last === today || last === yesterday) {
        streak = 1;
        for (let i = allDays.length - 2; i >= 0; i--) {
          const diff = new Date(allDays[i + 1]).getTime() - new Date(allDays[i]).getTime();
          if (diff <= 86400000) streak++;
          else break;
        }
      }
    }

    return { totalSeconds, totalSessions, activitySums, weeklyData, dailyData, activityData, courseMap, streak };
  }, [logs]);

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.round((secs % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const exportCSV = () => {
    if (!logs.length) return;
    const header = "Date,Activity,Course,Week,Seconds,Minutes";
    const rows = logs.map((l) =>
      `${new Date(l.created_at).toISOString()},${l.activity_type},${l.course_type},${l.week_number},${l.active_seconds},${Math.round(l.active_seconds / 60)}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(user.display_name || "student").replace(/\s+/g, "_")}_practice_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-sm font-bold text-gray-300 shrink-0">
          {(user.display_name || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-100">{user.display_name || "No Name"}</p>
          <p className="text-[10px] text-gray-500">Joined {new Date(user.created_at).toLocaleDateString()}</p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
            title="Export as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : !stats ? (
        <p className="text-xs text-gray-500 text-center py-8">No practice data for this user</p>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-2">
            <KpiCard icon={<Clock className="w-4 h-4" />} label="Total Time" value={formatTime(stats.totalSeconds)} color="text-cyan-300" />
            <KpiCard icon={<Activity className="w-4 h-4" />} label="Sessions" value={String(stats.totalSessions)} color="text-amber-300" />
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Streak" value={`${stats.streak}d`} color="text-emerald-300" />
            <KpiCard icon={<BarChart3 className="w-4 h-4" />} label="Avg/Session" value={formatTime(Math.round(stats.totalSeconds / stats.totalSessions))} color="text-purple-300" />
          </div>

          {/* Activity Breakdown Bars */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Activity Breakdown</p>
            {(["shadowing", "pronunciation", "speaking"] as const).map((a) => {
              const secs = stats.activitySums[a];
              const maxSecs = Math.max(...Object.values(stats.activitySums), 1);
              const pct = (secs / maxSecs) * 100;
              return (
                <div key={a} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-gray-400 capitalize">{a}</span>
                    <span className="text-[10px] font-bold text-gray-300">{formatTime(secs)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: ACTIVITY_COLORS[a] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weekly Stacked Bar */}
          <ChartCard title="Weekly Practice (min)">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={stats.weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="week" tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }}
                />
                <Bar dataKey="shadowing" stackId="a" fill="#22d3ee" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pronunciation" stackId="a" fill="#f97316" />
                <Bar dataKey="speaking" stackId="a" fill="#a855f7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-3 mt-1">
              {["shadowing", "pronunciation", "speaking"].map((a) => (
                <span key={a} className="flex items-center gap-1 text-[8px] text-gray-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: ACTIVITY_COLORS[a] }} />
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </span>
              ))}
            </div>
          </ChartCard>

          {/* Daily Activity (last 30d) */}
          <ChartCard title="Daily Activity (Last 30 Days)">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={stats.dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 7, fill: "#6b7280" }} interval={4} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 7, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }}
                  formatter={(v: number) => `${v}m`}
                />
                <Bar dataKey="minutes" fill="#22d3ee" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Activity Pie + Course Split */}
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
            </ChartCard>

            <div className="space-y-2">
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

          {/* Recent Sessions */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Recent Sessions</p>
            {logs.slice(-10).reverse().map((l, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ACTIVITY_COLORS[l.activity_type] || "#888" }} />
                <span className="text-[10px] text-gray-400 capitalize flex-1">{l.activity_type}</span>
                <span className="text-[10px] text-gray-500">{new Date(l.created_at).toLocaleDateString()}</span>
                <span className="text-[10px] font-bold text-gray-300">{Math.round(l.active_seconds / 60)}m</span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
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
      const data = await fetchAllClasses();
      setClasses(data);
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
      const data = await fetchRecentPracticeLogs(50);
      setLogs(data);
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
      const data = await fetchRecentConversations(50);
      setConvos(data);
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

/* ── Audit Panel ──────────────────────────────────────────── */
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  change_role: { label: "Role Changed", color: "text-blue-300 bg-blue-500/15 border-blue-400/20" },
  delete_user: { label: "User Deleted", color: "text-red-300 bg-red-500/15 border-red-400/20" },
  remove_member: { label: "Member Removed", color: "text-orange-300 bg-orange-500/15 border-orange-400/20" },
  add_member: { label: "Member Added", color: "text-emerald-300 bg-emerald-500/15 border-emerald-400/20" },
};

function AuditPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auditData } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      const entries = auditData ?? [];
      setLogs(entries);

      const ids = new Set<string>();
      for (const e of entries) {
        if (e.admin_id) ids.add(e.admin_id);
        if (e.target_user_id) ids.add(e.target_user_id);
      }

      if (ids.size > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", Array.from(ids));

        const map: Record<string, string> = {};
        for (const p of profileData ?? []) {
          map[p.id] = p.display_name || "Unknown";
        }
        setProfiles(map);
      }

      setLoading(false);
    })();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (dateFrom) {
        const start = startOfDay(dateFrom).getTime();
        if (new Date(l.created_at).getTime() < start) return false;
      }
      if (dateTo) {
        const end = endOfDay(dateTo).getTime();
        if (new Date(l.created_at).getTime() > end) return false;
      }
      return true;
    });
  }, [logs, actionFilter, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [actionFilter, dateFrom, dateTo]);

  if (loading) return <LoadingSpinner />;

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getName = (id: string | null) => {
    if (!id) return "—";
    return profiles[id] || id.slice(0, 8) + "…";
  };

  const formatDetails = (action: string, details: any) => {
    if (!details || typeof details !== "object") return null;
    if (action === "change_role") {
      return `${details.old_role} → ${details.new_role}`;
    }
    if (action === "delete_user" && details.deleted_name) {
      return `"${details.deleted_name}"`;
    }
    if (details.class_id) {
      return `Class ${(details.class_id as string).slice(0, 8)}…`;
    }
    return null;
  };

  const actionTypes = ["all", ...Object.keys(ACTION_LABELS)];

  const clearFilters = () => {
    setActionFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = actionFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-2">
      {/* Filter Bar */}
      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
        {/* Action type filter */}
        <div className="flex gap-1 flex-wrap">
          {actionTypes.map((a) => {
            const meta = a === "all" ? null : ACTION_LABELS[a];
            return (
              <button
                key={a}
                onClick={() => setActionFilter(a)}
                className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all ${
                  actionFilter === a
                    ? "bg-amber-500/15 border border-amber-400/20 text-amber-300"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                }`}
              >
                {a === "all" ? "All" : meta?.label || a}
              </button>
            );
          })}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] text-gray-300 hover:bg-white/[0.06] transition-all">
                <CalendarIcon className="w-3 h-3 text-gray-500" />
                {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From…"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-white/10" align="start" side="bottom">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(d) => { setDateFrom(d ?? undefined); setFromOpen(false); }}
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
                {dateTo ? format(dateTo, "MMM d, yyyy") : "To…"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-white/10" align="end" side="bottom">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(d) => { setDateTo(d ?? undefined); setToOpen(false); }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-[9px] text-gray-500 hover:text-gray-300 px-1.5 py-1 rounded hover:bg-white/[0.04] transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{filteredLogs.length} of {logs.length} Entries</p>

      {filteredLogs.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-8">
          {logs.length === 0 ? "No audit logs yet. Actions will appear here as admins make changes." : "No entries match the current filters."}
        </p>
      )}

      {pagedLogs.map((entry) => {
        const actionMeta = ACTION_LABELS[entry.action] || { label: entry.action, color: "text-gray-300 bg-gray-500/15 border-gray-400/20" };
        const detail = formatDetails(entry.action, entry.details);

        return (
          <div key={entry.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${actionMeta.color}`}>
                {actionMeta.label}
              </span>
              <span className="text-[10px] text-gray-500 ml-auto">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-gray-500">by</span>
              <span className="text-amber-300 font-semibold">{getName(entry.admin_id)}</span>
              {entry.target_user_id && (
                <>
                  <span className="text-gray-600">→</span>
                  <span className="text-gray-300 font-semibold">{getName(entry.target_user_id)}</span>
                </>
              )}
              {detail && (
                <span className="text-gray-500 ml-1">({detail})</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-gray-400 font-bold tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
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
