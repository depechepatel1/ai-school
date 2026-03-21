import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ACTIONS = new Set(["change_role", "delete_user", "list_members", "remove_member", "add_member"]);

function respond(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return respond(500, { error: "Server misconfiguration" });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond(401, { error: "Unauthorized" });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return respond(401, { error: "Unauthorized" });
    }

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return respond(403, { error: "Forbidden: admin role required" });
    }

    const { action, ...params } = await req.json();

    // Validate action early
    if (!action || !VALID_ACTIONS.has(action)) {
      return respond(400, { error: `Invalid action. Must be one of: ${[...VALID_ACTIONS].join(", ")}` });
    }

    // Awaited audit logging (continues on failure)
    const audit = async (targetUserId: string | null, details: Record<string, unknown> = {}) => {
      try {
        const { error } = await adminClient
          .from("admin_audit_logs")
          .insert({
            admin_id: caller.id,
            action,
            target_user_id: targetUserId,
            details,
          });
        if (error) console.error("Audit log error:", error.message);
      } catch (e) {
        console.error("Audit log exception:", e);
      }
    };

    switch (action) {
      case "change_role": {
        const { user_id, new_role } = params;
        if (!user_id || !new_role) {
          return respond(400, { error: "user_id and new_role required" });
        }
        if (user_id === caller.id) {
          return respond(400, { error: "Cannot change your own role" });
        }
        const { data: oldRoleData } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id)
          .maybeSingle();
        const oldRole = oldRoleData?.role ?? "none";

        await adminClient.from("user_roles").delete().eq("user_id", user_id);
        const { error } = await adminClient.from("user_roles").insert({ user_id, role: new_role });
        if (error) return respond(500, { error: error.message });

        await audit(user_id, { old_role: oldRole, new_role });
        return respond(200, { success: true });
      }

      case "delete_user": {
        const { user_id } = params;
        if (!user_id) return respond(400, { error: "user_id required" });
        if (user_id === caller.id) {
          return respond(400, { error: "Cannot delete yourself" });
        }
        const { data: profile } = await adminClient
          .from("profiles")
          .select("display_name")
          .eq("id", user_id)
          .maybeSingle();

        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) return respond(500, { error: error.message });
        await adminClient.from("user_roles").delete().eq("user_id", user_id);
        await adminClient.from("class_memberships").delete().eq("user_id", user_id);
        await adminClient.from("parent_student_links").delete().eq("parent_id", user_id);
        await adminClient.from("parent_student_links").delete().eq("student_id", user_id);
        await adminClient.from("profiles").delete().eq("id", user_id);

        await audit(user_id, { deleted_name: profile?.display_name ?? "Unknown" });
        return respond(200, { success: true });
      }

      case "list_members": {
        const { class_id } = params;
        if (!class_id) return respond(400, { error: "class_id required" });
        const { data, error } = await adminClient
          .from("class_memberships")
          .select("user_id, joined_at")
          .eq("class_id", class_id);
        if (error) return respond(500, { error: error.message });
        const userIds = (data ?? []).map((m: any) => m.user_id);
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        const enriched = (data ?? []).map((m: any) => ({
          ...m,
          display_name: profiles?.find((p: any) => p.id === m.user_id)?.display_name ?? "Unknown",
        }));
        return respond(200, { members: enriched });
      }

      case "remove_member": {
        const { class_id, user_id } = params;
        if (!class_id || !user_id) return respond(400, { error: "class_id and user_id required" });
        const { error } = await adminClient
          .from("class_memberships")
          .delete()
          .eq("class_id", class_id)
          .eq("user_id", user_id);
        if (error) return respond(500, { error: error.message });

        await audit(user_id, { class_id, removed_from_class: true });
        return respond(200, { success: true });
      }

      case "add_member": {
        const { class_id, user_id } = params;
        if (!class_id || !user_id) return respond(400, { error: "class_id and user_id required" });
        const { error } = await adminClient
          .from("class_memberships")
          .upsert({ class_id, user_id }, { onConflict: "class_id,user_id" });
        if (error) return respond(500, { error: error.message });

        await audit(user_id, { class_id, added_to_class: true });
        return respond(200, { success: true });
      }

      default:
        return respond(400, { error: `Unknown action: ${action}` });
    }
  } catch (err: any) {
    return respond(500, { error: err.message });
  }
});
