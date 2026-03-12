import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Eye, Trash2, Search, ChevronLeft, ChevronRight, CheckSquare, Square, AlertTriangle, Clock, Activity, TrendingUp, BarChart3, ArrowLeft, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/safe-error";
import { adminAction, KpiCard, ChartCard, LoadingSpinner, formatTime, ROLES, ROLE_COLORS, ACTIVITY_COLORS, PIE_COLORS } from "./admin-shared";

export default function UsersPanel() {
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

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = !searchQuery || (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

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

  if (selectedUser) {
    return <StudentDrillDown user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

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
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-200 placeholder:text-gray-500 outline-none focus:border-amber-400/30 transition-all"
          />
        </div>
        <div className="flex gap-1">
          {["all", ...ROLES].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`flex-1 px-1.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
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
                <button onClick={() => setBulkConfirm({ action: "role" })} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-500/15 border border-teal-400/20 text-teal-300 hover:bg-teal-500/25 transition-all">Change Role</button>
                <button onClick={() => setBulkConfirm({ action: "delete" })} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/15 border border-red-400/20 text-red-300 hover:bg-red-500/25 transition-all">Delete</button>
                <button onClick={() => setChecked(new Set())} className="text-[10px] text-gray-500 hover:text-gray-300 px-1">Clear</button>
              </div>
            ) : bulkConfirm.action === "role" && !bulkConfirm.role ? (
              <div className="space-y-1.5">
                <p className="text-[10px] text-amber-300 font-bold">Set role for {bulkIds.length} users:</p>
                <div className="flex gap-1">
                  {ROLES.map((r) => (
                    <button key={r} onClick={() => setBulkConfirm({ action: "role", role: r })} className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${ROLE_COLORS[r]} hover:scale-105`}>{r}</button>
                  ))}
                  <button onClick={() => setBulkConfirm(null)} className="text-[10px] text-gray-500 hover:text-gray-300 px-1">✕</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-[10px] text-red-300 flex-1">
                  {bulkConfirm.action === "delete" ? `Permanently delete ${bulkIds.length} user(s)?` : `Change ${bulkIds.length} user(s) to ${bulkConfirm.role}?`}
                </p>
                <button disabled={busy} onClick={handleBulkAction} className="px-2.5 py-1 rounded text-xs font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50">{busy ? "…" : "Confirm"}</button>
                <button onClick={() => setBulkConfirm(null)} className="text-[10px] text-gray-500 hover:text-gray-300 px-1">Cancel</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Select All */}
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
            <button onClick={() => setSelectedUser(u)} className="p-1.5 rounded-lg text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all" title="View practice breakdown">
              <Eye className="w-3.5 h-3.5" />
            </button>
            {changingRole === u.id ? (
              <div className="flex gap-1">
                {ROLES.map((r) => (
                  <button key={r} disabled={busy || r === u.role} onClick={() => handleRoleChange(u.id, r)} className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${r === u.role ? ROLE_COLORS[r] + " opacity-50" : "bg-white/[0.04] border-white/[0.1] text-gray-400 hover:text-white hover:bg-white/[0.08]"}`}>{r}</button>
                ))}
                <button onClick={() => setChangingRole(null)} className="text-[10px] text-gray-500 hover:text-gray-300 px-1">✕</button>
              </div>
            ) : (
              <button
                onClick={() => !isSelf(u.id) && setChangingRole(u.id)}
                disabled={isSelf(u.id)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${ROLE_COLORS[u.role] || "bg-gray-500/15 text-gray-400 border-gray-400/20"} ${isSelf(u.id) ? "opacity-50 cursor-default" : "hover:scale-105 cursor-pointer"}`}
                title={isSelf(u.id) ? "Can't change own role" : "Click to change role"}
              >
                {u.role}
              </button>
            )}
            {!isSelf(u.id) && (
              <button onClick={() => setConfirmDelete(u.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete user">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <AnimatePresence>
            {confirmDelete === u.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-[10px] text-red-300 flex-1">Permanently delete <strong>{u.display_name}</strong>?</p>
                <button disabled={busy} onClick={() => handleDelete(u.id)} className="px-2 py-1 rounded text-[9px] font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50">{busy ? "…" : "Delete"}</button>
                <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-gray-500 hover:text-gray-300 px-1">Cancel</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-default">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-gray-400 font-bold tabular-nums">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-default">
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
      const { data } = await supabase
        .from("student_practice_logs")
        .select("activity_type, course_type, week_number, active_seconds, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      setLogs(data ?? []);
      setLoading(false);
    })();
  }, [user.id]);

  const stats = useMemo(() => {
    if (!logs.length) return null;
    const totalSeconds = logs.reduce((s, l) => s + (l.active_seconds || 0), 0);
    const totalSessions = logs.length;
    const activitySums: Record<string, number> = { shadowing: 0, pronunciation: 0, speaking: 0 };
    for (const l of logs) { const a = l.activity_type; if (activitySums[a] !== undefined) activitySums[a] += l.active_seconds || 0; }
    const weekMap = new Map<number, Record<string, number>>();
    for (const l of logs) {
      const wk = l.week_number || 1;
      if (!weekMap.has(wk)) weekMap.set(wk, { shadowing: 0, pronunciation: 0, speaking: 0 });
      const bucket = weekMap.get(wk)!;
      const a = l.activity_type;
      if (bucket[a] !== undefined) bucket[a] += l.active_seconds || 0;
    }
    const weeklyData = Array.from(weekMap.entries()).sort(([a], [b]) => a - b).map(([wk, vals]) => ({
      week: `W${wk}`, shadowing: Math.round(vals.shadowing / 60), pronunciation: Math.round(vals.pronunciation / 60), speaking: Math.round(vals.speaking / 60),
    }));
    const dailyMap = new Map<string, number>();
    for (const l of logs) { const day = new Date(l.created_at).toISOString().slice(0, 10); dailyMap.set(day, (dailyMap.get(day) || 0) + (l.active_seconds || 0)); }
    const dailyData = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([date, secs]) => ({ date: date.slice(5), minutes: Math.round(secs / 60) }));
    const activityData = Object.entries(activitySums).map(([name, secs]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(secs / 60), key: name }));
    const courseMap: Record<string, number> = {};
    for (const l of logs) { const ct = l.course_type || "unknown"; courseMap[ct] = (courseMap[ct] || 0) + (l.active_seconds || 0); }
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
          if (diff <= 86400000) streak++; else break;
        }
      }
    }
    return { totalSeconds, totalSessions, activitySums, weeklyData, dailyData, activityData, courseMap, streak };
  }, [logs]);

  const exportCSV = () => {
    if (!logs.length) return;
    const header = "Date,Activity,Course,Week,Seconds,Minutes";
    const rows = logs.map((l) => `${new Date(l.created_at).toISOString()},${l.activity_type},${l.course_type},${l.week_number},${l.active_seconds},${Math.round(l.active_seconds / 60)}`);
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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-sm font-bold text-gray-300 shrink-0">{(user.display_name || "?")[0].toUpperCase()}</div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-100">{user.display_name || "No Name"}</p>
          <p className="text-[10px] text-gray-500">Joined {new Date(user.created_at).toLocaleDateString()}</p>
        </div>
        {logs.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all" title="Export as CSV">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : !stats ? (
        <p className="text-xs text-gray-500 text-center py-8">No practice data for this user</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <KpiCard icon={<Clock className="w-4 h-4" />} label="Total Time" value={formatTime(stats.totalSeconds)} color="text-cyan-300" />
            <KpiCard icon={<Activity className="w-4 h-4" />} label="Sessions" value={String(stats.totalSessions)} color="text-amber-300" />
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Streak" value={`${stats.streak}d`} color="text-emerald-300" />
            <KpiCard icon={<BarChart3 className="w-4 h-4" />} label="Avg/Session" value={formatTime(Math.round(stats.totalSeconds / stats.totalSessions))} color="text-purple-300" />
          </div>

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
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full rounded-full" style={{ background: ACTIVITY_COLORS[a] }} />
                  </div>
                </div>
              );
            })}
          </div>

          <ChartCard title="Weekly Practice (min)">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={stats.weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="week" tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} />
                <Bar dataKey="shadowing" stackId="a" fill="#22d3ee" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pronunciation" stackId="a" fill="#f97316" />
                <Bar dataKey="speaking" stackId="a" fill="#a855f7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-3 mt-1">
              {["shadowing", "pronunciation", "speaking"].map((a) => (
                <span key={a} className="flex items-center gap-1 text-[8px] text-gray-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: ACTIVITY_COLORS[a] }} /> {a.charAt(0).toUpperCase() + a.slice(1)}
                </span>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Daily Activity (Last 30 Days)">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={stats.dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 7, fill: "#6b7280" }} interval={4} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 7, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} formatter={(v: number) => `${v}m`} />
                <Bar dataKey="minutes" fill="#22d3ee" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-2 gap-2">
            <ChartCard title="Activity Split">
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={stats.activityData} cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={3} dataKey="value">
                    {stats.activityData.map((entry, i) => (<Cell key={entry.key} fill={ACTIVITY_COLORS[entry.key] || PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} formatter={(v: number) => `${v}m`} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <div className="space-y-2">
              {Object.entries(stats.courseMap).map(([course, seconds]) => (
                <div key={course} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${course === "igcse" ? "text-amber-300" : "text-cyan-300"}`}>{course}</span>
                  <p className="text-sm font-bold text-white/80 mt-0.5">{formatTime(seconds)}</p>
                </div>
              ))}
            </div>
          </div>

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
