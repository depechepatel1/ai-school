import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Miss Li — a friendly, patient, and encouraging English language tutor helping students prepare for IELTS and IGCSE Speaking exams.

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

    // --- Lovable AI Gateway ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...validMessages],
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Edge function error:", error.message);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
