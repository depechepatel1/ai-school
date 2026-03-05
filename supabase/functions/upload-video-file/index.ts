import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_PATHS = [
  "intro.mp4",
  "analysis-bg.mp4",
  ...Array.from({ length: 10 }, (_, i) => `loop-stack/${i + 1}.mp4`),
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetPath = formData.get("path") as string | null;

    if (!file || !targetPath) {
      return new Response(
        JSON.stringify({ error: "Missing file or path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_PATHS.includes(targetPath)) {
      return new Response(
        JSON.stringify({ error: `Invalid path. Must be one of: ${VALID_PATHS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from("videos")
      .upload(targetPath, new Uint8Array(arrayBuffer), {
        contentType: "video/mp4",
        upsert: true,
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, path: targetPath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
