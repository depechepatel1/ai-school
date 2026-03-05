const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const url = `${supabaseUrl}/storage/v1/object/public/videos/loop-stack/1.mp4`;

  try {
    // Fetch enough bytes to find codec info (moov atom usually in first 50KB)
    const res = await fetch(url, { headers: { Range: "bytes=0-65535" } });
    const buf = new Uint8Array(await res.arrayBuffer());
    
    // Search for codec identifiers in the binary
    const text = new TextDecoder("ascii", { fatal: false }).decode(buf);
    
    const codecs: string[] = [];
    // Look for common codec markers
    if (text.includes("avc1") || text.includes("avc3")) codecs.push("H.264/AVC");
    if (text.includes("hev1") || text.includes("hvc1")) codecs.push("H.265/HEVC");
    if (text.includes("vp09")) codecs.push("VP9");
    if (text.includes("av01")) codecs.push("AV1");
    if (text.includes("mp4a")) codecs.push("AAC Audio");
    if (text.includes("mp4v")) codecs.push("MPEG-4 Visual");
    
    // Find ftyp brand
    const ftypIdx = text.indexOf("ftyp");
    const brand = ftypIdx >= 0 ? text.substring(ftypIdx + 4, ftypIdx + 12).replace(/\0/g, "") : "unknown";
    
    // Look for moov, mdat atoms
    const hasmoov = text.includes("moov");
    const hasmdat = text.includes("mdat");
    const hasstbl = text.includes("stbl");
    const hasstsd = text.includes("stsd");
    
    // Try to find the codec from stsd
    let stsdCodec = "not found";
    const stsdIdx = text.indexOf("stsd");
    if (stsdIdx >= 0) {
      // The codec fourcc is typically 12 bytes after stsd
      stsdCodec = text.substring(stsdIdx, stsdIdx + 40).replace(/[\x00-\x1f\x7f-\xff]/g, ".");
    }
    
    // Check file size
    const totalSize = res.headers.get("content-range")?.split("/")?.[1] || "unknown";
    
    return new Response(JSON.stringify({
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
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
