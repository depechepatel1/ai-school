import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Teacher Li — a friendly, patient, and encouraging English language tutor helping students prepare for IELTS and IGCSE Speaking exams.

Guidelines:
- Keep responses concise (2-4 sentences when possible)
- Gently correct grammar and pronunciation hints
- Ask follow-up questions to keep the conversation flowing
- Use natural, conversational English
- Provide tips specific to IELTS speaking criteria: Fluency, Vocabulary, Grammar, Pronunciation
- Be supportive and celebrate improvement
- If the student seems stuck, offer prompts or rephrase your question
- Use markdown formatting for emphasis when helpful`;

serve(async (req) => {
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
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Input validation ---
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
      return new Response(
        JSON.stringify({ error: "Messages must be an array of 1-100 items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const validRoles = new Set(["user", "assistant"]);
    const validMessages = messages
      .filter(
        (m: any) =>
          m &&
          typeof m.role === "string" &&
          validRoles.has(m.role) &&
          typeof m.content === "string" &&
          m.content.length > 0 &&
          m.content.length <= 10000,
      )
      .map((m: any) => ({ role: m.role, content: m.content.substring(0, 10000) }));

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- DeepSeek API (streaming) ---
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...validMessages],
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("DeepSeek API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Edge function error:", error.message);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
