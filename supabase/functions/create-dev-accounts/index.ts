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
  { email: "dev-admin@test.com", password: "devtest123", role: "admin", displayName: "Dev Admin" },
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

    // 6. Seed practice data for IELTS student
    if (ieltsStudentId) {
      // Check if we already seeded
      const { data: existing } = await adminClient
        .from("student_practice_logs")
        .select("id")
        .eq("user_id", ieltsStudentId)
        .limit(1);

      if (!existing || existing.length === 0) {
        const now = new Date();
        const iso = (d: Date) => d.toISOString();
        const daysAgo = (n: number) => {
          const d = new Date(now);
          d.setDate(d.getDate() - n);
          d.setHours(10 + (n % 3), 30, 0, 0);
          return d;
        };

        const rows: any[] = [];

        // Today's partial homework (mixed completion)
        rows.push(
          { user_id: ieltsStudentId, activity_type: "shadowing", course_type: "ielts", practice_mode: "homework", week_number: 1, active_seconds: 600, target_seconds: 900, created_at: iso(now) },
          { user_id: ieltsStudentId, activity_type: "pronunciation", course_type: "ielts", practice_mode: "homework", week_number: 1, active_seconds: 600, target_seconds: 600, created_at: iso(now) },
          { user_id: ieltsStudentId, activity_type: "speaking", course_type: "ielts", practice_mode: "homework", week_number: 1, active_seconds: 480, target_seconds: 1200, created_at: iso(now) },
        );

        // Streak: 1-4 days ago (today already covered above)
        for (let d = 1; d <= 4; d++) {
          rows.push({
            user_id: ieltsStudentId, activity_type: "shadowing", course_type: "ielts",
            practice_mode: "homework", week_number: 1, active_seconds: 900, target_seconds: 900,
            created_at: iso(daysAgo(d)),
          });
        }

        // Historical weekly data (weeks 1-4, varied)
        const historical = [
          { day: 7,  act: "shadowing",     mode: "homework",     wk: 1, sec: 900 },
          { day: 7,  act: "pronunciation", mode: "homework",     wk: 1, sec: 600 },
          { day: 8,  act: "speaking",      mode: "homework",     wk: 1, sec: 1200 },
          { day: 9,  act: "shadowing",     mode: "independent",  wk: 1, sec: 450 },
          { day: 12, act: "shadowing",     mode: "homework",     wk: 2, sec: 900 },
          { day: 12, act: "pronunciation", mode: "homework",     wk: 2, sec: 600 },
          { day: 13, act: "speaking",      mode: "homework",     wk: 2, sec: 800 },
          { day: 14, act: "shadowing",     mode: "independent",  wk: 2, sec: 300 },
          { day: 15, act: "pronunciation", mode: "independent",  wk: 2, sec: 400 },
          { day: 19, act: "shadowing",     mode: "homework",     wk: 3, sec: 900 },
          { day: 19, act: "speaking",      mode: "homework",     wk: 3, sec: 1200 },
          { day: 20, act: "pronunciation", mode: "homework",     wk: 3, sec: 600 },
          { day: 21, act: "shadowing",     mode: "independent",  wk: 3, sec: 500 },
          { day: 25, act: "shadowing",     mode: "homework",     wk: 4, sec: 700 },
          { day: 26, act: "pronunciation", mode: "homework",     wk: 4, sec: 600 },
          { day: 26, act: "speaking",      mode: "homework",     wk: 4, sec: 1000 },
          { day: 27, act: "shadowing",     mode: "independent",  wk: 4, sec: 350 },
        ];

        for (const h of historical) {
          rows.push({
            user_id: ieltsStudentId, activity_type: h.act, course_type: "ielts",
            practice_mode: h.mode, week_number: h.wk,
            active_seconds: h.sec, target_seconds: h.act === "shadowing" ? 900 : h.act === "pronunciation" ? 600 : 1200,
            created_at: iso(daysAgo(h.day)),
          });
        }

        await adminClient.from("student_practice_logs").insert(rows);
      }
    }

    // 7. Seed practice data for IGCSE student
    if (igcseStudentId) {
      const { data: existingIgcse } = await adminClient
        .from("student_practice_logs")
        .select("id")
        .eq("user_id", igcseStudentId)
        .limit(1);

      if (!existingIgcse || existingIgcse.length === 0) {
        const now = new Date();
        const iso = (d: Date) => d.toISOString();
        const daysAgo = (n: number) => {
          const d = new Date(now);
          d.setDate(d.getDate() - n);
          d.setHours(9 + (n % 4), 15, 0, 0);
          return d;
        };

        const rows: any[] = [];

        // Today's partial homework
        rows.push(
          { user_id: igcseStudentId, activity_type: "shadowing", course_type: "igcse", practice_mode: "homework", week_number: 1, active_seconds: 400, target_seconds: 600, created_at: iso(now) },
          { user_id: igcseStudentId, activity_type: "pronunciation", course_type: "igcse", practice_mode: "homework", week_number: 1, active_seconds: 600, target_seconds: 600, created_at: iso(now) },
          { user_id: igcseStudentId, activity_type: "speaking", course_type: "igcse", practice_mode: "homework", week_number: 1, active_seconds: 300, target_seconds: 600, created_at: iso(now) },
        );

        // Streak: 1-3 days ago
        for (let d = 1; d <= 3; d++) {
          rows.push({
            user_id: igcseStudentId, activity_type: "shadowing", course_type: "igcse",
            practice_mode: "homework", week_number: 1, active_seconds: 600, target_seconds: 600,
            created_at: iso(daysAgo(d)),
          });
        }

        // Historical weekly data
        const historical = [
          { day: 7,  act: "shadowing",     mode: "homework",    wk: 1, sec: 600 },
          { day: 7,  act: "pronunciation", mode: "homework",    wk: 1, sec: 500 },
          { day: 8,  act: "speaking",      mode: "homework",    wk: 1, sec: 600 },
          { day: 10, act: "shadowing",     mode: "independent", wk: 1, sec: 300 },
          { day: 13, act: "shadowing",     mode: "homework",    wk: 2, sec: 600 },
          { day: 13, act: "pronunciation", mode: "homework",    wk: 2, sec: 600 },
          { day: 14, act: "speaking",      mode: "homework",    wk: 2, sec: 450 },
          { day: 16, act: "shadowing",     mode: "independent", wk: 2, sec: 250 },
          { day: 20, act: "shadowing",     mode: "homework",    wk: 3, sec: 600 },
          { day: 20, act: "speaking",      mode: "homework",    wk: 3, sec: 600 },
          { day: 21, act: "pronunciation", mode: "homework",    wk: 3, sec: 600 },
          { day: 22, act: "shadowing",     mode: "independent", wk: 3, sec: 400 },
          { day: 26, act: "shadowing",     mode: "homework",    wk: 4, sec: 500 },
          { day: 27, act: "pronunciation", mode: "homework",    wk: 4, sec: 600 },
          { day: 27, act: "speaking",      mode: "homework",    wk: 4, sec: 550 },
        ];

        for (const h of historical) {
          rows.push({
            user_id: igcseStudentId, activity_type: h.act, course_type: "igcse",
            practice_mode: h.mode, week_number: h.wk,
            active_seconds: h.sec, target_seconds: 600,
            created_at: iso(daysAgo(h.day)),
          });
        }

        await adminClient.from("student_practice_logs").insert(rows);
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
