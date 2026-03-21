/**
 * Admin Events Panel
 * Queries user_events table — shows KPIs, top events, daily trend, and recent events list.
 */
import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { CalendarIcon, Zap, Hash, Users, TrendingUp } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { KpiCard, ChartCard, LoadingSpinner, PIE_COLORS } from "./admin-shared";

type DatePreset = "7d" | "30d" | "all" | "custom";

interface UserEvent {
  id: string;
  user_id: string;
  event_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
  course_type: string | null;
  deployment_region: string;
}

// ── Event category colors ──────────────────────────────────────
const EVENT_COLORS: Record<string, string> = {
  user_signed_up: "#10b981",
  practice_completed: "#22d3ee",
  practice_started: "#6366f1",
  streak_milestone: "#f59e0b",
  pronunciation_score_received: "#f97316",
  shadowing_sentence_mastered: "#a855f7",
  fluency_score_calculated: "#ec4899",
  ai_response_rated: "#14b8a6",
  band_score_improved: "#eab308",
  weekly_goal_met: "#84cc16",
};

export default function AdminEventsPanel() {
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [dateFrom, setDateFrom] = useState<Date>(startOfDay(subDays(new Date(), 7)));
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
    } else if (p === "all") {
      setDateFrom(startOfDay(subDays(now, 365)));
      setDateTo(endOfDay(now));
    }
  }, []);

  const rangeStart = dateFrom.toISOString();
  const rangeEnd = endOfDay(dateTo).toISOString();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-user-events", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_events")
        .select("id, user_id, event_name, metadata, created_at, course_type, deployment_region")
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as UserEvent[];
    },
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    if (!events.length) return null;

    const totalEvents = events.length;
    const uniqueUsers = new Set(events.map((e) => e.user_id)).size;
    const uniqueEventTypes = new Set(events.map((e) => e.event_name)).size;

    // Top events by count
    const eventCounts: Record<string, number> = {};
    for (const e of events) {
      eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
    }
    const topEvents = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count, key: name }));

    // Daily trend
    const dayMap = new Map<string, number>();
    const days = differenceInDays(dateTo, dateFrom) + 1;
    for (let i = 0; i < Math.min(days, 60); i++) {
      const d = format(subDays(dateTo, i), "MMM d");
      dayMap.set(d, 0);
    }
    for (const e of events) {
      const d = format(new Date(e.created_at), "MMM d");
      dayMap.set(d, (dayMap.get(d) || 0) + 1);
    }
    const dailyTrend = Array.from(dayMap.entries())
      .reverse()
      .map(([day, count]) => ({ day, count }));

    // Events per user (distribution)
    const userEventCounts: Record<string, number> = {};
    for (const e of events) {
      userEventCounts[e.user_id] = (userEventCounts[e.user_id] || 0) + 1;
    }
    const avgEventsPerUser = totalEvents / uniqueUsers;

    // Course split
    const courseMap: Record<string, number> = {};
    for (const e of events) {
      const ct = e.course_type || "unset";
      courseMap[ct] = (courseMap[ct] || 0) + 1;
    }

    // Recent events (last 20)
    const recentEvents = events.slice(0, 20);

    return {
      totalEvents,
      uniqueUsers,
      uniqueEventTypes,
      avgEventsPerUser,
      topEvents,
      dailyTrend,
      courseMap,
      recentEvents,
    };
  }, [events, dateFrom, dateTo]);

  if (isLoading) return <LoadingSpinner variant="chart" />;

  const presets: { id: DatePreset; label: string }[] = [
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "all", label: "All Time" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-4">
      {/* Date range picker */}
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
          {events.length} events in range{events.length >= 1000 ? " (capped at 1,000)" : ""}
        </p>
      </div>

      {!stats ? (
        <p className="text-xs text-gray-500 text-center py-4">No events in selected range</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2">
            <KpiCard icon={<Zap className="w-4 h-4" />} label="Total Events" value={String(stats.totalEvents)} color="text-cyan-300" />
            <KpiCard icon={<Users className="w-4 h-4" />} label="Unique Users" value={String(stats.uniqueUsers)} color="text-emerald-300" />
            <KpiCard icon={<Hash className="w-4 h-4" />} label="Event Types" value={String(stats.uniqueEventTypes)} color="text-amber-300" />
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Avg/User" value={stats.avgEventsPerUser.toFixed(1)} color="text-purple-300" />
          </div>

          {/* Daily Activity Trend */}
          <ChartCard title="Daily Event Volume">
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={stats.dailyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="eventGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 8, fill: "#6b7280" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} />
                <Area type="monotone" dataKey="count" stroke="#22d3ee" fill="url(#eventGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-2 gap-2">
            {/* Top Events */}
            <ChartCard title="Top Events">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.topEvents} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 7, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 7, fill: "#9ca3af" }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                    {stats.topEvents.map((entry, i) => (
                      <Cell key={entry.key} fill={EVENT_COLORS[entry.key] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Course Split */}
            <ChartCard title="Course Split">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={Object.entries(stats.courseMap).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {Object.keys(stats.courseMap).map((key, i) => (
                      <Cell key={key} fill={key === "ielts" ? "#22d3ee" : key === "igcse" ? "#f59e0b" : "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 10, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Recent Events Table */}
          <ChartCard title="Recent Events">
            <div className="max-h-[200px] overflow-y-auto scrollbar-hide">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-1.5 px-2">Event</th>
                    <th className="text-left py-1.5 px-2">Course</th>
                    <th className="text-left py-1.5 px-2">Region</th>
                    <th className="text-right py-1.5 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentEvents.map((e) => (
                    <tr key={e.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-1.5 px-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: EVENT_COLORS[e.event_name] || "#6b7280" }} />
                        <span className="text-white/80 font-medium">{e.event_name}</span>
                      </td>
                      <td className="py-1.5 px-2 text-gray-400">{e.course_type || "—"}</td>
                      <td className="py-1.5 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${e.deployment_region === "cn" ? "bg-red-500/15 text-red-300" : "bg-teal-500/15 text-teal-300"}`}>
                          {e.deployment_region}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right text-gray-500">{format(new Date(e.created_at), "MMM d, HH:mm")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}
