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

    const text = await req.text();
    
    let items: any[] = [];
    const jsonObjects = text.split(/\}\s*\{/).map((chunk, i, arr) => {
      if (i === 0) return chunk + (arr.length > 1 ? "}" : "");
      if (i === arr.length - 1) return "{" + chunk;
      return "{" + chunk + "}";
    });
    
    for (const jsonStr of jsonObjects) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          items.push(...parsed);
        } else if (parsed.curriculum && Array.isArray(parsed.curriculum)) {
          items.push(...parsed.curriculum);
        }
      } catch {
        // skip malformed chunks
      }
    }

    if (items.length === 0) {
      return respond(400, { error: "No curriculum items found" });
    }

    const moduleToBand = (mod: number | string) => {
      const n = typeof mod === "number" ? mod : parseInt(String(mod), 10);
      if (isNaN(n)) return 9;
      return Math.min(9, Math.floor((n - 1) / 3) + 4);
    };

    const rows = items.map((item) => ({
      track: "pronunciation",
      band_level: moduleToBand(item.module ?? 1),
      topic: `${item.target_sound ?? "General"}`,
      sentence: item.sentence,
      sort_order: item.id ?? 0,
    }));

    const chunkSize = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from("curriculum_items").insert(chunk);
      if (error) throw error;
      inserted += chunk.length;
    }

    return respond(200, { success: true, inserted });
  } catch (err) {
    return respond(500, { error: String(err) });
  }
});
