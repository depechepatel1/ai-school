import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const filePath = "shared/tongue-twisters.json";

    // Download current file
    const { data: urlData } = admin.storage
      .from("curriculums")
      .getPublicUrl(filePath);

    const res = await fetch(`${urlData.publicUrl}?t=${Date.now()}`);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawText = await res.text();

    // Try parsing as-is
    let items: unknown[] = [];
    try {
      const parsed = JSON.parse(rawText);
      if (parsed?.curriculum) items = parsed.curriculum;
      else if (Array.isArray(parsed)) items = parsed;
    } catch {
      // Concatenated JSON — split on }{ boundary
      const chunks = rawText.split(/\}\s*\{/).map((chunk: string, i: number, arr: string[]) => {
        if (arr.length === 1) return chunk;
        if (i === 0) return chunk + "}";
        if (i === arr.length - 1) return "{" + chunk;
        return "{" + chunk + "}";
      });

      for (const chunk of chunks) {
        try {
          const parsed = JSON.parse(chunk);
          if (parsed?.curriculum && Array.isArray(parsed.curriculum)) {
            items.push(...parsed.curriculum);
          } else if (Array.isArray(parsed)) {
            items.push(...parsed);
          }
        } catch {
          // skip unparseable chunks
        }
      }
    }

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "No items found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-assign sequential IDs
    const normalised = items.map((item: any, idx: number) => ({
      ...item,
      id: idx + 1,
    }));

    const validJson = JSON.stringify({ curriculum: normalised }, null, 2);

    // Re-upload as valid single JSON
    const blob = new Blob([validJson], { type: "application/json" });
    const { error: uploadErr } = await admin.storage
      .from("curriculums")
      .upload(filePath, blob, { upsert: true });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: uploadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: `Fixed! ${normalised.length} items normalised into valid JSON.`,
        item_count: normalised.length,
        sample: normalised.slice(0, 3),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
