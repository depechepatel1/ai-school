import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function respond(status: number, body: any) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const supabase = createClient(supabaseUrl, serviceKey);

    const paths = Array.from({ length: 10 }, (_, i) => `loop-stack/${i + 1}.mp4`);
    const results: { path: string; status: string; error?: string }[] = [];

    for (const path of paths) {
      try {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos/${path}`;
        const res = await fetch(publicUrl);
        if (!res.ok) {
          results.push({ path, status: "download_failed", error: `HTTP ${res.status}` });
          continue;
        }
        const blob = await res.blob();

        const { error } = await supabase.storage
          .from("videos")
          .upload(path, blob, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (error) {
          results.push({ path, status: "upload_failed", error: error.message });
        } else {
          results.push({ path, status: "ok" });
        }
      } catch (e) {
        results.push({ path, status: "error", error: String(e) });
      }
    }

    return respond(200, { results });
  } catch (err) {
    return respond(500, { error: String(err) });
  }
});
