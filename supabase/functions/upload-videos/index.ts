import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Re-upload all loop-stack videos with correct content-type
  const paths = Array.from({ length: 10 }, (_, i) => `loop-stack/${i + 1}.mp4`);
  const results: { path: string; status: string; error?: string }[] = [];

  for (const path of paths) {
    try {
      // Download from public URL
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos/${path}`;
      console.log(`Downloading ${publicUrl}...`);
      const res = await fetch(publicUrl);
      if (!res.ok) {
        results.push({ path, status: "download_failed", error: `HTTP ${res.status}` });
        continue;
      }
      const blob = await res.blob();
      console.log(`Re-uploading ${path} (${(blob.size / 1024 / 1024).toFixed(2)} MB) with video/mp4...`);

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

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
