import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Verify the calling user is a parent
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check caller is a parent
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (callerRole?.role !== "parent") {
      return new Response(JSON.stringify({ error: "Only parents can link children" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string" || email.length > 255) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Find the student by email using admin API
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const student = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === trimmedEmail
    );

    if (!student) {
      return new Response(JSON.stringify({ error: "No account found with that email" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify target is a student
    const { data: studentRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", student.id)
      .maybeSingle();

    if (studentRole?.role !== "student") {
      return new Response(JSON.stringify({ error: "That account is not a student account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-link
    if (student.id === user.id) {
      return new Response(JSON.stringify({ error: "Cannot link to yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already linked
    const { data: existingLink } = await adminClient
      .from("parent_student_links")
      .select("id")
      .eq("parent_id", user.id)
      .eq("student_id", student.id)
      .maybeSingle();

    if (existingLink) {
      return new Response(JSON.stringify({ error: "This child is already linked to your account" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the link
    const { error: insertErr } = await adminClient
      .from("parent_student_links")
      .insert({ parent_id: user.id, student_id: student.id });

    if (insertErr) {
      return new Response(JSON.stringify({ error: "Failed to link child" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return student profile info
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", student.id)
      .maybeSingle();

    return new Response(JSON.stringify({
      success: true,
      child: {
        id: student.id,
        display_name: profile?.display_name ?? student.email,
        avatar_url: profile?.avatar_url ?? null,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
