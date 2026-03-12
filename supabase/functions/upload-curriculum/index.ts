import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FILES = [
  { name: "ielts-shadowing.json", localPath: "ielts-shadowing.json" },
  { name: "igcse-shadowing.json", localPath: "igcse-shadowing.json" },
];

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

    let body: Record<string, unknown[]> | null = null;
    try {
      body = await req.json();
    } catch {
      // If no body, try fetching from the public data folder
    }

    const results: { file: string; status: string; error?: string }[] = [];

    for (const file of FILES) {
      try {
        let content: string;

        if (body && body[file.name]) {
          content = JSON.stringify(body[file.name]);
        } else {
          const origin = req.headers.get("origin") || req.headers.get("referer") || "";
          const baseUrl = origin.replace(/\/$/, "");
          const fetchUrl = `${baseUrl}/data/${file.localPath}`;
          const res = await fetch(fetchUrl);
          if (!res.ok) {
            results.push({ file: file.name, status: "fetch_failed", error: `HTTP ${res.status} from ${fetchUrl}` });
            continue;
          }
          content = await res.text();
        }

        JSON.parse(content);

        const blob = new Blob([content], { type: "application/json" });
        const { error } = await supabase.storage
          .from("curriculum")
          .upload(file.name, blob, {
            contentType: "application/json",
            upsert: true,
          });

        if (error) {
          results.push({ file: file.name, status: "upload_failed", error: error.message });
        } else {
          results.push({ file: file.name, status: "ok" });
        }
      } catch (e) {
        results.push({ file: file.name, status: "error", error: String(e) });
      }
    }

    return respond(200, { results });
  } catch (err) {
    return respond(500, { error: String(err) });
  }
});
