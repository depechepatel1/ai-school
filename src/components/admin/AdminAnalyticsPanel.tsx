import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { SEMESTER_START, SEMESTER_WEEKS } from "@/lib/semester";
import { Clock, Users, Activity, CalendarIcon, GraduationCap } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { KpiCard, ChartCard, LoadingSpinner, formatTime, ACTIVITY_COLORS, PIE_COLORS } from "./admin-shared";

type DatePreset = "7d" | "30d" | "semester" | "custom";

export default function AnalyticsPanel() {
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
  }, []);

  const rangeEnd = endOfDay(dateTo).toISOString();
  const rangeStart = dateFrom.toISOString();

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["admin-practice-logs", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_practice_logs")
        .select("user_id, activity_type, course_type, week_number, active_seconds, created_at")
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, created_at");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: mockTests = [], isLoading: mockLoading } = useQuery({
    queryKey: ["admin-mock-tests", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("mock_test_sessions")
        .select("id, user_id, overall_band, duration_seconds, created_at, week_number")
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const loading = logsLoading || profilesLoading || mockLoading;

  const stats = useMemo(() => {
    if (!logs.length) return null;

    const totalSeconds = logs.reduce((s, l) => s + (l.active_seconds || 0), 0);
    const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;
    const totalSessions = logs.length;

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

    const courseMap: Record<string, number> = {};
    for (const l of logs) {
      const ct = l.course_type || "unknown";
      courseMap[ct] = (courseMap[ct] || 0) + (l.active_seconds || 0);
    }

    // Mock test stats
    const totalMockTests = mockTests.length;
    const mockTestUsers = new Set(mockTests.map((m) => m.user_id)).size;
    const avgBand = mockTests.length
      ? (mockTests.reduce((s, m) => s + (parseFloat(m.overall_band || "0") || 0), 0) / mockTests.length).toFixed(1)
      : "—";

    const bandDistMap: Record<string, number> = {};
    for (const m of mockTests) {
      const band = m.overall_band || "N/A";
      bandDistMap[band] = (bandDistMap[band] || 0) + 1;
    }
    const bandDistData = Object.entries(bandDistMap)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .map(([band, count]) => ({ band, count }));

    return { totalSeconds, uniqueUsers, totalSessions, weeklyData, weeklyUsersData, activityData, growthData, courseMap, totalMockTests, mockTestUsers, avgBand, bandDistData };
  }, [logs, profiles, mockTests]);

  if (loading) return <LoadingSpinner variant="chart" />;

  const presets: { id: DatePreset; label: string }[] = [
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "semester", label: "Semester" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
        <div className="flex items-center gap-1">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                preset === p.id
                  ? "bg-amber-500/15 border border-amber-400/20 text-amber-300"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

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

        <p className="text-[10px] text-gray-500 text-center">
          {logs.length} sessions in range
        </p>
      </div>

      {!stats ? (
        <p className="text-xs text-gray-500 text-center py-4">No data in selected range</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <KpiCard icon={<Clock className="w-4 h-4" />} label="Total Practice" value={formatTime(stats.totalSeconds)} color="text-cyan-300" />
            <KpiCard icon={<Users className="w-4 h-4" />} label="Active Students" value={String(stats.uniqueUsers)} color="text-emerald-300" />
            <KpiCard icon={<Activity className="w-4 h-4" />} label="Sessions" value={String(stats.totalSessions)} color="text-amber-300" />
          </div>

          <ChartCard title="Weekly Practice Time (min)">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={stats.weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="week" tick={{ fontSize: 8, fill: "#6b7280" }} interval={3} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} labelStyle={{ color: "#9ca3af" }} />
                <Bar dataKey="minutes" fill="#22d3ee" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

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
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} />
                <Area type="monotone" dataKey="users" stroke="#10b981" fill="url(#userGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-2 gap-2">
            <ChartCard title="Activity Split">
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={stats.activityData} cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={3} dataKey="value">
                    {stats.activityData.map((entry, i) => (
                      <Cell key={entry.key} fill={ACTIVITY_COLORS[entry.key] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} formatter={(v: number) => `${v}m`} />
                </PieChart>
              </ResponsiveContainer>
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
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} />
                  <Area type="monotone" dataKey="total" stroke="#f59e0b" fill="url(#growthGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stats.courseMap).map(([course, seconds]) => (
              <div key={course} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${course === "igcse" ? "text-amber-300" : "text-cyan-300"}`}>{course}</span>
                <p className="text-sm font-bold text-white/80 mt-0.5">{formatTime(seconds)}</p>
              </div>
            ))}
          </div>

          {/* Mock Test Analytics */}
          <div className="grid grid-cols-3 gap-2">
            <KpiCard icon={<GraduationCap className="w-4 h-4" />} label="Mock Tests" value={String(stats.totalMockTests)} color="text-violet-300" />
            <KpiCard icon={<Users className="w-4 h-4" />} label="Test Takers" value={String(stats.mockTestUsers)} color="text-rose-300" />
            <KpiCard icon={<Activity className="w-4 h-4" />} label="Avg Band" value={stats.avgBand} color="text-amber-300" />
          </div>

          {stats.bandDistData.length > 0 && (
            <ChartCard title="Mock Test Band Distribution">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={stats.bandDistData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="band" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} />
                  <Bar dataKey="count" fill="#a855f7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
