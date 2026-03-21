

# Rename & Abstract AI Chat Edge Function for Provider Switching

## What
Rename the `deepseek-chat` edge function to `ai-chat`, update all frontend references, and add a provider-switching mechanism in the edge function so you can flip between Lovable AI and Aliyun DashScope by changing a single env var.

## Why
- Removes misleading "deepseek" naming (already using Lovable AI gateway)
- Adds an `ai` provider flag to `provider-config.ts` for consistency
- The edge function reads `AI_PROVIDER` env var to route to Lovable or Aliyun — one secret change to migrate

## Changes

### 1. New edge function: `supabase/functions/ai-chat/index.ts`
- Copy current `deepseek-chat` logic
- Add provider routing at the top:
  - `AI_PROVIDER` env var: `"lovable"` (default) or `"aliyun"`
  - Lovable: `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY`, model `google/gemini-3-flash-preview`
  - Aliyun: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` with `DASHSCOPE_API_KEY`, model `qwen-turbo`
- All existing validation, error handling, streaming support preserved

### 2. Delete `supabase/functions/deepseek-chat/`
- Remove the old function directory and undeploy it

### 3. Update `src/services/ai.ts`
- Change `supabase.functions.invoke("deepseek-chat"` → `"ai-chat"`
- Update comments to remove DeepSeek references

### 4. Update `src/lib/chat-stream.ts`
- Change URL from `functions/v1/deepseek-chat` → `functions/v1/ai-chat`
- Update comments

### 5. Update `src/lib/provider-config.ts`
- Add new provider flag: `ai: "lovable" as "lovable" | "aliyun"` (for documentation; actual switching is via env var on the backend)

### 6. Update `.env.example`
- Replace DeepSeek references with `AI_PROVIDER` documentation

## How to migrate later
When ready for Aliyun DashScope:
1. Set secret `DASHSCOPE_API_KEY` with your Aliyun key
2. Set secret `AI_PROVIDER` to `"aliyun"`
3. Redeploy `ai-chat` — done. No code changes needed.

## Files touched
- **Created**: `supabase/functions/ai-chat/index.ts`
- **Deleted**: `supabase/functions/deepseek-chat/index.ts`
- **Edited**: `src/services/ai.ts`, `src/lib/chat-stream.ts`, `src/lib/provider-config.ts`, `.env.example`
- No database changes

