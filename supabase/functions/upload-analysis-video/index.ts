import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const videoUrl =
      "https://res.cloudinary.com/daujjfaqg/video/upload/2026-02-28T11-06-56_softly_atmospheric_ssio5s.mp4";

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

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
