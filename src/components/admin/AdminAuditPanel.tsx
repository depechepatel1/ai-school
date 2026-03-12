import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LoadingSpinner, ACTION_LABELS } from "./admin-shared";

export default function AuditPanel() {
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
      const { data: auditData } = await supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      const entries = auditData ?? [];
      setLogs(entries);
      const ids = new Set<string>();
      for (const e of entries) { if (e.admin_id) ids.add(e.admin_id); if (e.target_user_id) ids.add(e.target_user_id); }
      if (ids.size > 0) {
        const { data: profileData } = await supabase.from("profiles").select("id, display_name").in("id", Array.from(ids));
        const map: Record<string, string> = {};
        for (const p of profileData ?? []) map[p.id] = p.display_name || "Unknown";
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (dateFrom && new Date(l.created_at).getTime() < startOfDay(dateFrom).getTime()) return false;
      if (dateTo && new Date(l.created_at).getTime() > endOfDay(dateTo).getTime()) return false;
      return true;
    });
  }, [logs, actionFilter, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [actionFilter, dateFrom, dateTo]);

  if (loading) return <LoadingSpinner />;

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const getName = (id: string | null) => !id ? "—" : profiles[id] || id.slice(0, 8) + "…";

  const formatDetails = (action: string, details: any) => {
    if (!details || typeof details !== "object") return null;
    if (action === "change_role") return `${details.old_role} → ${details.new_role}`;
    if (action === "delete_user" && details.deleted_name) return `"${details.deleted_name}"`;
    if (details.class_id) return `Class ${(details.class_id as string).slice(0, 8)}…`;
    return null;
  };

  const actionTypes = ["all", ...Object.keys(ACTION_LABELS)];
  const clearFilters = () => { setActionFilter("all"); setDateFrom(undefined); setDateTo(undefined); };
  const hasFilters = actionFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-2">
      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
        <div className="flex gap-1 flex-wrap">
          {actionTypes.map((a) => {
            const meta = a === "all" ? null : ACTION_LABELS[a];
            return (
              <button key={a} onClick={() => setActionFilter(a)} className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${actionFilter === a ? "bg-amber-500/15 border border-amber-400/20 text-amber-300" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"}`}>
                {a === "all" ? "All" : meta?.label || a}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] text-gray-300 hover:bg-white/[0.06] transition-all">
                <CalendarIcon className="w-3 h-3 text-gray-500" /> {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From…"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-white/10" align="start" side="bottom">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d ?? undefined); setFromOpen(false); }} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <span className="text-[10px] text-gray-600">→</span>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] text-gray-300 hover:bg-white/[0.06] transition-all">
                <CalendarIcon className="w-3 h-3 text-gray-500" /> {dateTo ? format(dateTo, "MMM d, yyyy") : "To…"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-white/10" align="end" side="bottom">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d ?? undefined); setToOpen(false); }} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {hasFilters && (
            <button onClick={clearFilters} className="text-[9px] text-gray-500 hover:text-gray-300 px-1.5 py-1 rounded hover:bg-white/[0.04] transition-all">Clear</button>
          )}
        </div>
      </div>

      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{filteredLogs.length} of {logs.length} Entries</p>

      {filteredLogs.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-8">{logs.length === 0 ? "No audit logs yet. Actions will appear here as admins make changes." : "No entries match the current filters."}</p>
      )}

      {pagedLogs.map((entry) => {
        const actionMeta = ACTION_LABELS[entry.action] || { label: entry.action, color: "text-gray-300 bg-gray-500/15 border-gray-400/20" };
        const detail = formatDetails(entry.action, entry.details);
        return (
          <div key={entry.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${actionMeta.color}`}>{actionMeta.label}</span>
              <span className="text-[10px] text-gray-500 ml-auto">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-gray-500">by</span>
              <span className="text-amber-300 font-semibold">{getName(entry.admin_id)}</span>
              {entry.target_user_id && (<><span className="text-gray-600">→</span><span className="text-gray-300 font-semibold">{getName(entry.target_user_id)}</span></>)}
              {detail && <span className="text-gray-500 ml-1">({detail})</span>}
            </div>
          </div>
        );
      })}

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
