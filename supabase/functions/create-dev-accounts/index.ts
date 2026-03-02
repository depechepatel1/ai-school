import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEV_ACCOUNTS = [
  { email: "dev-igcse@test.com", password: "devtest123", role: "student", displayName: "Dev IGCSE Student" },
  { email: "dev-ielts@test.com", password: "devtest123", role: "student", displayName: "Dev IELTS Student" },
  { email: "dev-teacher@test.com", password: "devtest123", role: "teacher", displayName: "Dev Teacher" },
  { email: "dev-parent@test.com", password: "devtest123", role: "parent", displayName: "Dev Parent" },
  { email: "dev-admin@test.com", password: "devtest123", role: "teacher", displayName: "Dev Admin" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: any[] = [];
    const userIds: Record<string, string> = {};

    // 1. Create or find all accounts
    for (const account of DEV_ACCOUNTS) {
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === account.email);

      if (existing) {
        // Ensure role exists
        const { data: roleData } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", existing.id)
          .maybeSingle();

        if (!roleData) {
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

    // 2. Ensure IGCSE class exists
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

    // 3. Ensure IELTS class exists
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

    // 4. Add students to classes
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

    // 5. Link parent to both students
    if (parentId) {
      for (const studentId of [igcseStudentId, ieltsStudentId]) {
        if (studentId) {
          await adminClient
            .from("parent_student_links")
            .upsert({ parent_id: parentId, student_id: studentId }, { onConflict: "parent_id,student_id" });
        }
      }
    }

    return new Response(JSON.stringify({ results, igcseClassId, ieltsClassId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
