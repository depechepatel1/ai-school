import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This edge function reads the curriculum JSON files from a public URL
// and uploads them to the 'curriculum' storage bucket.
// Run once after deploying, then the files are served from storage.

const FILES = [
  { name: "ielts-shadowing.json", localPath: "ielts-shadowing.json" },
  { name: "igcse-shadowing.json", localPath: "igcse-shadowing.json" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Accept JSON body with the file contents directly
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
        // Fetch from the app's public/data/ folder via the origin
        const origin = req.headers.get("origin") || req.headers.get("referer") || "";
        const baseUrl = origin.replace(/\/$/, "");
        const fetchUrl = `${baseUrl}/data/${file.localPath}`;
        console.log(`Fetching ${fetchUrl}...`);
        const res = await fetch(fetchUrl);
        if (!res.ok) {
          results.push({ file: file.name, status: "fetch_failed", error: `HTTP ${res.status} from ${fetchUrl}` });
          continue;
        }
        content = await res.text();
      }

      // Validate it's valid JSON
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

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
