import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VIDEOS: { url: string; path: string }[] = [
  { url: "https://res.cloudinary.com/daujjfaqg/video/upload/3_gwwlr7.mp4", path: "loop-stack/1.mp4" },
  { url: "https://res.cloudinary.com/daujjfaqg/video/upload/2_tww92r.mp4", path: "loop-stack/2.mp4" },
  { url: "https://res.cloudinary.com/daujjfaqg/video/upload/1_zfeho1.mp4", path: "loop-stack/3.mp4" },
  { url: "https://res.cloudinary.com/daujjfaqg/video/upload/v1772209664/5_pcckfd.mp4", path: "loop-stack/4.mp4" },
  { url: "https://res.cloudinary.com/daujjfaqg/video/upload/v1772209663/4_pj1zft.mp4", path: "loop-stack/5.mp4" },
  { url: "https://res.cloudinary.com/daujjfaqg/video/upload/v1772209664/7_j9hmpi.mp4", path: "loop-stack/6.mp4" },
  { url: "https://res.cloudinary.com/daujjfaqg/video/upload/v1772209665/8_ajofc4.mp4", path: "loop-stack/7.mp4" },
  { url: "https://res.cloudinary.com/daujjfaqg/video/upload/v1772209667/10_x4hzn2.mp4", path: "loop-stack/8.mp4" },
  { url: "https://res.cloudinary.com/daujjfaqg/video/upload/v1772209663/6_re1zc9.mp4", path: "loop-stack/9.mp4" },
  { url: "https://res.cloudinary.com/daujjfaqg/video/upload/Video_Generation_of_Teacher_s_Welcome_jeioja.mp4", path: "intro.mp4" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const results: { path: string; status: string; error?: string }[] = [];

  for (const video of VIDEOS) {
    try {
      console.log(`Downloading ${video.url}...`);
      const res = await fetch(video.url);
      if (!res.ok) {
        results.push({ path: video.path, status: "download_failed", error: `HTTP ${res.status}` });
        continue;
      }
      const blob = await res.blob();
      console.log(`Uploading ${video.path} (${(blob.size / 1024 / 1024).toFixed(1)} MB)...`);

      const { error } = await supabase.storage
        .from("videos")
        .upload(video.path, blob, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (error) {
        results.push({ path: video.path, status: "upload_failed", error: error.message });
      } else {
        results.push({ path: video.path, status: "ok" });
      }
    } catch (e) {
      results.push({ path: video.path, status: "error", error: String(e) });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
