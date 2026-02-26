

## Plan: Abstracted Voice & Backend Layer for China Deployment

### Context
Yes — Microsoft Edge on all platforms (PC, iPad, mobile) is a solid approach for China. Edge ships with high-quality "Natural" neural voices (en-GB and en-US female options like "Sonia" and "Jenny") that work offline with no API calls, so no firewall issues. The current `tts.ts` already prioritizes these voices.

### What This Plan Does
1. **Create a TTS provider abstraction** (`src/lib/tts-provider.ts`) with a unified interface that currently uses browser `SpeechSynthesis` but can be swapped to Aliyun DashScope TTS with one config change
2. **Create an STT provider abstraction** (`src/lib/stt-provider.ts`) wrapping the current Web Speech API, with a plug point for Aliyun speech recognition
3. **Add accent-aware voice selection** — the existing UK/US toggle in SpeakingStudio will pick the correct Edge Natural voice (en-GB vs en-US)
4. **Update SpeakingStudio** to use the new provider abstractions instead of raw `SpeechSynthesis`
5. **Add a central config** (`src/lib/provider-config.ts`) with feature flags for TTS provider (`"browser" | "aliyun"`), STT provider (`"browser" | "aliyun"`), and backend (`"supabase" | "memfire"`) — all defaulting to browser/current

### Implementation Details

**`src/lib/provider-config.ts`** — Central config
```typescript
export const PROVIDERS = {
  tts: "browser" as "browser" | "aliyun",
  stt: "browser" as "browser" | "aliyun", 
  backend: "supabase" as "supabase" | "memfire",
};
```

**`src/lib/tts-provider.ts`** — Unified TTS interface
- `speak(text, accent: "uk" | "us", options?)` → returns `{ stop(), onEnd() }`
- `"browser"` mode: uses existing Edge Natural voice logic, selecting en-GB or en-US based on accent param
- `"aliyun"` mode: placeholder that calls a future `aliyun-tts` edge function, returns audio blob
- Word boundary events forwarded for prosody highlighting

**`src/lib/stt-provider.ts`** — Unified STT interface
- `startListening(lang)` / `stopListening()` / `onResult` / `onInterim`
- `"browser"` mode: wraps current Web Speech API
- `"aliyun"` mode: placeholder for future Aliyun Paraformer API via edge function

**`src/pages/SpeakingStudio.tsx`** changes:
- `handlePlayModel` and `speakTeacherText` call `ttsProvider.speak(text, accent)` instead of raw `SpeechSynthesisUtterance`
- Speech recognition uses `sttProvider` instead of raw `SpeechRecognition`
- Accent toggle (already in UI) passes `"uk" | "us"` to TTS provider

**No edge functions needed now** — browser TTS/STT requires no backend. When you get the Aliyun API key later, we add one edge function (`aliyun-tts`) and flip the config flag.

### Files to Create/Modify
- **Create** `src/lib/provider-config.ts`
- **Create** `src/lib/tts-provider.ts`
- **Create** `src/lib/stt-provider.ts`
- **Modify** `src/pages/SpeakingStudio.tsx` — use providers
- **Modify** `src/lib/tts.ts` — refactor to export accent-aware voice selection for reuse

