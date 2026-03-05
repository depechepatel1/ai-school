

## Plan: Unified Transcript Bar + Auto-Punctuation (Provider-Swappable)

### Summary

1. Show a full-width `LiveTranscriptBar` in **both** homework and independent modes, replacing the "You" chat bubble
2. Auto-punctuate raw STT output using a lightweight AI call
3. Route the punctuation call through a **provider abstraction** so it can be swapped from Lovable AI to Aliyun DashScope by changing a single flag

### Files

| File | Action |
|------|--------|
| `src/lib/punctuate.ts` | **Create** — provider-routed punctuation service |
| `supabase/functions/punctuate/index.ts` | **Create** — edge function with provider switching |
| `src/components/speaking/LiveTranscriptBar.tsx` | **Create** — transcript display component |
| `src/hooks/useSpeakingTest.ts` | **Modify** — expose reactive `liveTranscript` / `liveInterim`, debounced punctuation |
| `src/pages/SpeakingStudio.tsx` | **Modify** — render transcript bar in both modes, remove "You" bubble |
| `src/lib/provider-config.ts` | **Modify** — add `punctuation` provider flag |

### Detail

**1. Provider config — add punctuation flag**

```typescript
export const PROVIDERS = {
  // ...existing flags...
  /** "lovable" = Lovable AI gateway, "aliyun" = DashScope qwen-turbo */
  punctuation: "lovable" as "lovable" | "aliyun",
};
```

**2. Edge function `supabase/functions/punctuate/index.ts`**

- Reads an env var `PUNCTUATION_PROVIDER` (default `"lovable"`)
- If `"lovable"`: calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `google/gemini-2.5-flash-lite`, using `LOVABLE_API_KEY`
- If `"aliyun"`: calls `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` with `qwen-turbo`, using `DASHSCOPE_API_KEY`
- Both use the identical OpenAI-compatible request shape, so the only differences are URL, API key, and model name
- System prompt: *"Add correct punctuation and capitalisation to this spoken English text. Return only the corrected text."*
- Non-streaming, returns `{ text: "punctuated result" }`

**3. Client service `src/lib/punctuate.ts`**

- Exports `punctuate(rawText: string): Promise<string>`
- Calls the `punctuate` edge function via `supabase.functions.invoke`
- Includes a debounce wrapper (`debouncedPunctuate`) that waits 800ms after last call before firing

**4. `LiveTranscriptBar` component**

- Full-width, absolute positioned above bottom dock (`bottom-24`)
- `ScrollArea` with `max-h-[6rem]` (~4 visible lines), `text-base leading-relaxed`
- Shows finalised text in white, interim text appended in italic `text-white/50`
- Auto-scrolls to bottom via ref + `useEffect`
- Glassmorphism styling (`bg-black/50 backdrop-blur-2xl border border-white/10 rounded-2xl`)

**5. `useSpeakingTest` hook changes**

- Add `useState` for `liveTranscript` and `liveInterim` alongside existing refs
- `onResult` callback: update both ref and state, trigger `debouncedPunctuate` which replaces `liveTranscript` with punctuated version
- `onInterim` callback: update `liveInterim` state
- `clearTranscript()` resets both
- Return `liveTranscript`, `liveInterim`, `clearTranscript`

**6. `SpeakingStudio.tsx` changes**

- Remove the "You" chat bubble in **all** modes
- Render `<LiveTranscriptBar>` above the bottom action bar in both homework and independent modes
- Keep Teacher/Persona chat panel for independent mode

### Provider swap path

To switch to Aliyun DashScope later:
1. Set backend secret `PUNCTUATION_PROVIDER=aliyun` and add `DASHSCOPE_API_KEY`
2. Optionally update `provider-config.ts` flag for any client-side branching

No other code changes needed — the edge function handles the routing internally.

