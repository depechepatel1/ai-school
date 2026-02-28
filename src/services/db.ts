/**
 * Database Service Layer
 * 
 * All database calls are isolated here so UI components never import
 * the Supabase client directly. When migrating to Memfire or another
 * Supabase-compatible backend, only the client import path needs to change.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Conversations ──────────────────────────────────────────────

export async function fetchConversations(userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createConversation(userId: string, title = "New Conversation") {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateConversationTitle(conversationId: string, title: string) {
  const { error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", conversationId);
  if (error) throw error;
}

// ── Messages ───────────────────────────────────────────────────

export async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMessageHistory(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertMessage(conversationId: string, role: string, content: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role, content });
  if (error) throw error;
}

// ── Realtime ───────────────────────────────────────────────────

export function subscribeToMessages(
  conversationId: string,
  onInsert: (payload: any) => void
) {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      onInsert
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Classes (Teacher) ──────────────────────────────────────────

export async function fetchClasses() {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createClass(name: string, createdBy: string) {
  const { error } = await supabase
    .from("classes")
    .insert({ name, created_by: createdBy });
  if (error) throw error;
}

export async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── User Roles ─────────────────────────────────────────────────

export async function fetchUserRole(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

export async function insertUserRole(userId: string, role: "student" | "teacher" | "parent") {
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role });
  if (error) throw error;
}

// ── Profiles ───────────────────────────────────────────────────

export async function fetchProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

// ── Curriculum ─────────────────────────────────────────────────

export async function fetchCurriculumPage(
  track: string,
  offset = 0,
  limit = 5,
  bandLevel?: number,
) {
  let query = supabase
    .from("curriculum_items")
    .select("id, track, band_level, topic, sentence, sort_order")
    .eq("track", track)
    .order("sort_order", { ascending: true })
    .range(offset, offset + limit - 1);

  if (bandLevel) query = query.eq("band_level", bandLevel);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchNextSentence(track: string, afterSortOrder: number) {
  const { data, error } = await supabase
    .from("curriculum_items")
    .select("id, track, band_level, topic, sentence, sort_order")
    .eq("track", track)
    .gt("sort_order", afterSortOrder)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCurriculumCount(track: string) {
  const { count, error } = await supabase
    .from("curriculum_items")
    .select("id", { count: "exact", head: true })
    .eq("track", track);
  if (error) throw error;
  return count ?? 0;
}

// ── Curriculum Progress ───────────────────────────────────────

export async function fetchCurriculumProgress(userId: string, track: string) {
  const { data } = await supabase
    .from("student_curriculum_progress")
    .select("last_sort_order, last_score")
    .eq("user_id", userId)
    .eq("track", track)
    .maybeSingle();
  return data;
}

export async function saveCurriculumProgress(
  userId: string,
  track: string,
  lastSortOrder: number,
  lastScore?: number | null,
) {
  const { error } = await supabase
    .from("student_curriculum_progress")
    .upsert(
      {
        user_id: userId,
        track,
        last_sort_order: lastSortOrder,
        last_score: lastScore ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,track" },
    );
  if (error) throw error;
}

// ── Course & Week Helpers ─────────────────────────────────────

export async function fetchStudentCourseType(userId: string): Promise<string | null> {
  // Join class_memberships → classes to get course_type
  const { data, error } = await supabase
    .from("class_memberships")
    .select("class_id, classes(course_type)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  // classes is a joined object
  const classes = data?.classes as any;
  return classes?.course_type ?? null;
}

export async function fetchSelectedWeek(userId: string): Promise<number | null> {
  const { data } = await supabase
    .from("profiles")
    .select("selected_week")
    .eq("id", userId)
    .maybeSingle();
  return (data as any)?.selected_week ?? null;
}

export async function updateSelectedWeek(userId: string, week: number) {
  const { error } = await supabase
    .from("profiles")
    .update({ selected_week: week } as any)
    .eq("id", userId);
  if (error) throw error;
}

export async function createClassWithCourse(name: string, createdBy: string, courseType: "ielts" | "igcse") {
  const { error } = await supabase
    .from("classes")
    .insert({ name, created_by: createdBy, course_type: courseType } as any);
  if (error) throw error;
}
