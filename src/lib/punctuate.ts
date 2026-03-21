/**
 * Auto-punctuation service
 * 
 * Calls the `punctuate` edge function which routes to either
 * Lovable AI (gemini-2.5-flash-lite) or Aliyun DashScope (qwen-turbo)
 * based on the PUNCTUATION_PROVIDER env var.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Send raw STT text to be punctuated by AI.
 * Falls back to the original text on error.
 */
export async function punctuate(rawText: string): Promise<string> {
  if (!rawText.trim()) return rawText;

  try {
    const { data, error } = await supabase.functions.invoke("punctuate", {
      body: { text: rawText },
    });

    if (error) {
      console.warn("Punctuation error, using raw text:", error);
      return rawText;
    }

    return data?.text || rawText;
  } catch (err) {
    console.warn("Punctuation failed, using raw text:", err);
    return rawText;
  }
}

/**
 * Creates a debounced punctuation function.
 * Only fires after `delayMs` of inactivity.
 */
export function createDebouncedPunctuate(
  callback: (punctuated: string) => void,
  delayMs = 800
): { punctuate: (rawText: string) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const punctuateFn = (rawText: string) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const result = await punctuate(rawText);
      callback(result);
    }, delayMs);
  };

  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
  };

  return { punctuate: punctuateFn, cancel };
}
