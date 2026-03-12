/**
 * Shared helpers for Admin Dashboard panels
 */
import { ChartSkeleton, TableSkeleton } from "@/components/ui/dashboard-skeleton";

export const ACTIVITY_COLORS: Record<string, string> = {
  shadowing: "#22d3ee",
  pronunciation: "#f97316",
  speaking: "#a855f7",
};

export const PIE_COLORS = ["#22d3ee", "#f97316", "#a855f7"];

export const ROLES = ["student", "teacher", "parent", "admin"] as const;

export const ROLE_COLORS: Record<string, string> = {
  student: "bg-teal-500/15 text-teal-300 border-teal-400/20",
  teacher: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  parent: "bg-rose-500/15 text-rose-300 border-rose-400/20",
  admin: "bg-amber-500/15 text-amber-300 border-amber-400/20",
};

export const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  change_role: { label: "Role Changed", color: "text-teal-300 bg-teal-500/15 border-teal-400/20" },
  delete_user: { label: "User Deleted", color: "text-red-300 bg-red-500/15 border-red-400/20" },
  remove_member: { label: "Member Removed", color: "text-orange-300 bg-orange-500/15 border-orange-400/20" },
  add_member: { label: "Member Added", color: "text-emerald-300 bg-emerald-500/15 border-emerald-400/20" },
};

export function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center gap-1">
      <div className={`${color}`}>{icon}</div>
      <p className="text-sm font-bold text-white/90">{value}</p>
      <p className="text-[8px] text-gray-500 uppercase tracking-wider font-bold">{label}</p>
    </div>
  );
}

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">{title}</p>
      {children}
    </div>
  );
}

export function LoadingSpinner({ variant = "table" }: { variant?: "chart" | "table" }) {
  return variant === "chart" ? <ChartSkeleton /> : <TableSkeleton />;
}

export function formatTime(secs: number) {
  const hrs = Math.floor(secs / 3600);
  const mins = Math.round((secs % 3600) / 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export async function adminAction(action: string, params: Record<string, any>) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("admin-manage-users", {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
