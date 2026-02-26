import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const text = await req.text();
    
    // Handle concatenated JSON objects by extracting all curriculum arrays
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
      return new Response(
        JSON.stringify({ error: "No curriculum items found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Map fields and determine band_level from module
    // Modules 1-3 → band 4, 4-6 → band 5, 7-9 → band 6, 10-12 → band 7, 13-15 → band 8
    const moduleToBand = (mod: number | string) => {
      const n = typeof mod === "number" ? mod : parseInt(String(mod), 10);
      if (isNaN(n)) return 9; // Capstone/review → band 9
      return Math.min(9, Math.floor((n - 1) / 3) + 4);
    };

    const rows = items.map((item) => ({
      track: "pronunciation",
      band_level: moduleToBand(item.module ?? 1),
      topic: `${item.target_sound ?? "General"}`,
      sentence: item.sentence,
      sort_order: item.id ?? 0,
    }));

    // Batch insert in chunks of 200
    const chunkSize = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from("curriculum_items").insert(chunk);
      if (error) throw error;
      inserted += chunk.length;
    }

    return new Response(
      JSON.stringify({ success: true, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
