import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return respond(500, { error: "Server misconfiguration" });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return respond(401, { error: "Unauthorized" });
  }
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return respond(401, { error: "Unauthorized" });
  }

  const url = `${supabaseUrl}/storage/v1/object/public/videos/loop-stack/1.mp4`;

  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-65535" } });
    const buf = new Uint8Array(await res.arrayBuffer());
    
    const text = new TextDecoder("ascii", { fatal: false }).decode(buf);
    
    const codecs: string[] = [];
    if (text.includes("avc1") || text.includes("avc3")) codecs.push("H.264/AVC");
    if (text.includes("hev1") || text.includes("hvc1")) codecs.push("H.265/HEVC");
    if (text.includes("vp09")) codecs.push("VP9");
    if (text.includes("av01")) codecs.push("AV1");
    if (text.includes("mp4a")) codecs.push("AAC Audio");
    if (text.includes("mp4v")) codecs.push("MPEG-4 Visual");
    
    const ftypIdx = text.indexOf("ftyp");
    const brand = ftypIdx >= 0 ? text.substring(ftypIdx + 4, ftypIdx + 12).replace(/\0/g, "") : "unknown";
    
    const hasmoov = text.includes("moov");
    const hasmdat = text.includes("mdat");
    const hasstbl = text.includes("stbl");
    const hasstsd = text.includes("stsd");
    
    let stsdCodec = "not found";
    const stsdIdx = text.indexOf("stsd");
    if (stsdIdx >= 0) {
      stsdCodec = text.substring(stsdIdx, stsdIdx + 40).replace(/[\x00-\x1f\x7f-\xff]/g, ".");
    }
    
    const totalSize = res.headers.get("content-range")?.split("/")?.[1] || "unknown";
    
    return respond(200, {
      totalFileSize: totalSize,
      fetchedBytes: buf.length,
      brand,
      codecs,
      hasmoov,
      hasmdat,
      hasstbl,
      hasstsd,
      stsdRegion: stsdCodec,
      firstBytes: Array.from(buf.slice(0, 32)).map(b => b.toString(16).padStart(2, "0")).join(" "),
    });
  } catch (e) {
    return respond(500, { error: String(e) });
  }
});
