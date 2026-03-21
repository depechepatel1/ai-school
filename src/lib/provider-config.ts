/**
 * Central Provider Configuration
 * 
 * Flip these flags to swap between browser-native APIs and cloud providers.
 * All components consume providers through tts-provider.ts and stt-provider.ts,
 * so changing a flag here switches the entire app with zero component changes.
 */

export const PROVIDERS = {
  /** "browser" = Web Speech API (Edge Natural voices), "aliyun" = DashScope TTS */
  tts: "browser" as "browser" | "aliyun",

  /** "browser" = Web Speech Recognition API, "aliyun" = DashScope Paraformer */
  stt: "browser" as "browser" | "aliyun",

  /** "supabase" = current Lovable Cloud, "memfire" = MemFire Cloud (China) */
  backend: "supabase" as "supabase" | "memfire",

  /** "browser" = local pitch detection + DTW, "aliyun" = Aliyun Speech Analysis API */
  speechAnalysis: "browser" as "browser" | "aliyun",

  /** "video" = looping background videos, "live2d" = Cubism avatar (requires pixi.js) */
  avatar: "video" as "video" | "live2d",

  /** "lovable" = Lovable AI gateway (gemini-2.5-flash-lite), "aliyun" = DashScope qwen-turbo */
  punctuation: "lovable" as "lovable" | "aliyun",

  /** "lovable" = Lovable AI gateway (gemini-3-flash-preview), "aliyun" = DashScope qwen-turbo
   *  Actual switching is done via the AI_PROVIDER env var on the backend. */
  ai: "lovable" as "lovable" | "aliyun",
};
