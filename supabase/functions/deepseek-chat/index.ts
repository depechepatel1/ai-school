import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://id-preview--84043c13-90f0-443c-a7e4-5b223d663f66.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Credentials": "true",
  };
}

const SYSTEM_PROMPT = `You are a friendly, patient, and encouraging English language tutor helping students prepare for the IELTS Speaking exam. 

Guidelines:
- Keep responses concise (2-4 sentences when possible)
- Gently correct grammar and pronunciation hints
- Ask follow-up questions to keep the conversation flowing
- Use natural, conversational English
- Provide tips specific to IELTS speaking criteria: Fluency, Vocabulary, Grammar, Pronunciation
- Be supportive and celebrate improvement
- If the student seems stuck, offer prompts or rephrase your question`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- AI Provider Configuration (env-driven) ---
    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("DEEPSEEK_API_KEY");
    const AI_API_BASE_URL = Deno.env.get("AI_API_BASE_URL") || "https://api.deepseek.com/v1";
    const AI_MODEL = Deno.env.get("AI_MODEL") || "deepseek-chat";

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY (or DEEPSEEK_API_KEY) is not configured");
    }

    // --- Input validation ---
    const { messages } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages must be an array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length === 0 || messages.length > 100) {
      return new Response(
        JSON.stringify({ error: "Messages count must be between 1 and 100" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validRoles = new Set(["user", "assistant"]);

    const validMessages = messages
      .filter((m: any) =>
        m &&
        typeof m.role === "string" &&
        validRoles.has(m.role) &&
        typeof m.content === "string" &&
        m.content.length > 0 &&
        m.content.length <= 10000
      )
      .map((m: any) => ({
        role: m.role,
        content: m.content.substring(0, 10000),
      }));

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...validMessages,
    ];

    // --- OpenAI-compatible chat completions call ---
    const response = await fetch(`${AI_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error.message);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
