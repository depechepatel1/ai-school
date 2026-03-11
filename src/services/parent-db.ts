/**
 * Parent-specific database helpers
 */
import { supabase } from "@/integrations/supabase/client";

export interface LinkedChild {
  id: string;
  display_name: string;
  avatar_url: string | null;
  linked_at: string;
}

export interface ChildPracticeSummary {
  totalSeconds: number;
  sessionsThisWeek: number;
  lastActive: string | null;
  byActivity: Record<string, number>;
}

/** Fetch all children linked to the current parent */
export async function fetchLinkedChildren(parentId: string): Promise<LinkedChild[]> {
  const { data, error } = await supabase
    .from("parent_student_links")
    .select("student_id, linked_at")
    .eq("parent_id", parentId);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const studentIds = data.map((d) => d.student_id);
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", studentIds);
  if (profErr) throw profErr;

  return data.map((link) => {
    const prof = profiles?.find((p) => p.id === link.student_id);
    return {
      id: link.student_id,
      display_name: prof?.display_name ?? "Student",
      avatar_url: prof?.avatar_url ?? null,
      linked_at: link.linked_at,
    };
  });
}

/** Fetch practice summary for a specific child (last 7 days) */
export async function fetchChildPracticeSummary(childId: string): Promise<ChildPracticeSummary> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("student_practice_logs")
    .select("activity_type, active_seconds, created_at")
    .eq("user_id", childId)
    .gte("created_at", weekAgo.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;

  const byActivity: Record<string, number> = {};
  let totalSeconds = 0;
  let lastActive: string | null = null;

  for (const log of data ?? []) {
    totalSeconds += log.active_seconds;
    byActivity[log.activity_type] = (byActivity[log.activity_type] ?? 0) + log.active_seconds;
    if (!lastActive) lastActive = log.created_at;
  }

  return {
    totalSeconds,
    sessionsThisWeek: data?.length ?? 0,
    lastActive,
    byActivity,
  };
}

/** Link a child via the edge function */
export async function linkChildByEmail(email: string) {
  const { data, error } = await supabase.functions.invoke("link-child", {
    body: { email },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Unlink a child */
export async function unlinkChild(parentId: string, studentId: string) {
  const { error } = await supabase
    .from("parent_student_links")
    .delete()
    .eq("parent_id", parentId)
    .eq("student_id", studentId);
  if (error) throw error;
}
