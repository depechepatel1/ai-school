import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function respond(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return respond(401, { error: "Unauthorized" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return respond(500, { error: "Server misconfiguration" });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      return respond(401, { error: "Invalid token" });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", data.claims.sub)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return respond(403, { error: "Admin role required" });
    }

    const videoUrl = Deno.env.get("ANALYSIS_VIDEO_URL");
    if (!videoUrl) {
      return respond(500, { error: "Server misconfiguration" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const { error } = await supabase.storage
      .from("videos")
      .upload("analysis-bg.mp4", new Uint8Array(arrayBuffer), {
        contentType: "video/mp4",
        upsert: true,
      });

    if (error) throw error;

    return respond(200, { success: true });
  } catch (err) {
    return respond(500, { error: err.message });
  }
});
