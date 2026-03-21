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

const MAX_TOTAL_CHARS = 50000;

/** Provider configuration — switch by setting the AI_PROVIDER env var */
function getProviderConfig() {
  const provider = Deno.env.get("AI_PROVIDER") || "lovable";

  if (provider === "aliyun") {
    const apiKey = Deno.env.get("DASHSCOPE_API_KEY");
    if (!apiKey) return { error: "Server misconfiguration" };
    return {
      url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      apiKey,
      model: "qwen-turbo",
    };
  }

  // Default: Lovable AI gateway
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { error: "Server misconfiguration" };
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    apiKey,
    model: "google/gemini-3-flash-preview",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const totalChars = validMessages.reduce((sum: number, m: any) => sum + m.content.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return new Response(
        JSON.stringify({ error: "Conversation too long, please start a new chat." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const config = getProviderConfig();
    if ("error" in config) {
      return new Response(
        JSON.stringify({ error: config.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let response: Response;
    try {
      response = await fetch(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...validMessages],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
    } catch (fetchError) {
      console.error("AI gateway fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
