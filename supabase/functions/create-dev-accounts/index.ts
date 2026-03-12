import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEV_ACCOUNTS = [
  { email: "dev-igcse@test.com", password: "devtest123", role: "student", displayName: "Dev IGCSE Student" },
  { email: "dev-ielts@test.com", password: "devtest123", role: "student", displayName: "Dev IELTS Student" },
  { email: "dev-teacher@test.com", password: "devtest123", role: "teacher", displayName: "Dev Teacher" },
  { email: "dev-parent@test.com", password: "devtest123", role: "parent", displayName: "Dev Parent" },
  { email: "dev-admin@test.com", password: "devtest123", role: "admin", displayName: "Dev Admin" },
];

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
    // --- Auth: require admin ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return respond(401, { error: "Unauthorized" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return respond(401, { error: "Invalid token" });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.claims.sub)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return respond(403, { error: "Admin role required" });
    }

    const results: any[] = [];
    const userIds: Record<string, string> = {};

    for (const account of DEV_ACCOUNTS) {
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === account.email);

      if (existing) {
        const { data: existingRole } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", existing.id)
          .maybeSingle();

        if (!existingRole) {
          await adminClient.from("user_roles").insert({ user_id: existing.id, role: account.role });
        }
        userIds[account.email] = existing.id;
        results.push({ email: account.email, status: "already_exists", id: existing.id });
        continue;
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { display_name: account.displayName },
      });

      if (error) {
        results.push({ email: account.email, status: "error", message: error.message });
        continue;
      }

      if (data.user) {
        await adminClient.from("user_roles").insert({ user_id: data.user.id, role: account.role });
        userIds[account.email] = data.user.id;
      }
      results.push({ email: account.email, status: "created", id: data.user?.id });
    }

    const teacherId = userIds["dev-teacher@test.com"];
    const igcseStudentId = userIds["dev-igcse@test.com"];
    const ieltsStudentId = userIds["dev-ielts@test.com"];
    const parentId = userIds["dev-parent@test.com"];

    let igcseClassId: string | null = null;
    if (teacherId) {
      const { data: existingIgcse } = await adminClient
        .from("classes")
        .select("id")
        .eq("course_type", "igcse")
        .eq("created_by", teacherId)
        .maybeSingle();

      if (existingIgcse) {
        igcseClassId = existingIgcse.id;
      } else {
        const { data: newClass } = await adminClient
          .from("classes")
          .insert({ name: "Dev IGCSE Class", course_type: "igcse", created_by: teacherId })
          .select("id")
          .single();
        igcseClassId = newClass?.id ?? null;
      }
    }

    let ieltsClassId: string | null = null;
    if (teacherId) {
      const { data: existingIelts } = await adminClient
        .from("classes")
        .select("id")
        .eq("course_type", "ielts")
        .eq("created_by", teacherId)
        .maybeSingle();

      if (existingIelts) {
        ieltsClassId = existingIelts.id;
      } else {
        const { data: newClass } = await adminClient
          .from("classes")
          .insert({ name: "Dev IELTS Class", course_type: "ielts", created_by: teacherId })
          .select("id")
          .single();
        ieltsClassId = newClass?.id ?? null;
      }
    }

    if (igcseClassId && igcseStudentId) {
      await adminClient
        .from("class_memberships")
        .upsert({ class_id: igcseClassId, user_id: igcseStudentId }, { onConflict: "class_id,user_id" });
    }
    if (ieltsClassId && ieltsStudentId) {
      await adminClient
        .from("class_memberships")
        .upsert({ class_id: ieltsClassId, user_id: ieltsStudentId }, { onConflict: "class_id,user_id" });
    }

    if (parentId) {
      for (const studentId of [igcseStudentId, ieltsStudentId]) {
        if (studentId) {
          await adminClient
            .from("parent_student_links")
            .upsert({ parent_id: parentId, student_id: studentId }, { onConflict: "parent_id,student_id" });
        }
      }
    }

    return respond(200, { results, igcseClassId, ieltsClassId });
  } catch (error) {
    return respond(500, { error: error.message });
  }
});
