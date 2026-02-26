import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEV_ACCOUNTS = [
  { email: "dev-student@test.com", password: "devtest123", role: "student", displayName: "Dev Student" },
  { email: "dev-teacher@test.com", password: "devtest123", role: "teacher", displayName: "Dev Teacher" },
  { email: "dev-parent@test.com", password: "devtest123", role: "parent", displayName: "Dev Parent" },
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

    const results = [];

    for (const account of DEV_ACCOUNTS) {
      // Check if user already exists by trying to find them
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
        results.push({ email: account.email, status: "already_exists", id: existing.id });
        continue;
      }

      // Create user with email confirmed
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

      // Assign role
      if (data.user) {
        await adminClient.from("user_roles").insert({ user_id: data.user.id, role: account.role });
      }

      results.push({ email: account.email, status: "created", id: data.user?.id });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
