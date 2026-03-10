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

    // List and delete all objects in the 'curriculum' bucket
    const { data: files, error: listErr } = await admin.storage
      .from("curriculum")
      .list("", { limit: 1000 });

    const deleted: string[] = [];

    if (files && files.length > 0) {
      const paths = files.map((f) => f.name);
      const { error: delErr } = await admin.storage
        .from("curriculum")
        .remove(paths);
      if (delErr) {
        return new Response(JSON.stringify({ error: `Delete files: ${delErr.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      deleted.push(...paths);
    }

    // Delete the bucket itself
    const { error: bucketErr } = await admin.storage.deleteBucket("curriculum");

    return new Response(
      JSON.stringify({
        message: "Cleanup complete",
        files_deleted: deleted,
        bucket_deleted: !bucketErr,
        bucket_error: bucketErr?.message ?? null,
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
