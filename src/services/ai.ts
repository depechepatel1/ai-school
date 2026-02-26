/**
 * AI Service Abstraction Layer
 * 
 * All AI/LLM calls go through this module. It uses an OpenAI-compatible
 * chat completions interface so the backend can be swapped to any
 * provider (DeepSeek, Aliyun DashScope, OpenAI, etc.) by changing
 * environment variables or the edge function configuration.
 * 
 * Currently proxied through a backend edge function for security.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIChatResponse {
  content: string;
}

/**
 * Send a chat completion request through the backend edge function.
 * The edge function handles provider selection, API keys, and rate limiting.
 */
export async function sendChatMessage(
  messages: ChatMessage[]
): Promise<AIChatResponse> {
  const { data, error } = await supabase.functions.invoke("deepseek-chat", {
    body: { messages },
  });

  if (error) throw error;

  return {
    content: data?.content || "Sorry, I couldn't process that. Please try again.",
  };
}

/**
 * Convenience: send a single user message with history context.
 */
export async function chat(
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const messages: ChatMessage[] = [
    ...history,
    { role: "user", content: userMessage },
  ];
  const response = await sendChatMessage(messages);
  return response.content;
}
