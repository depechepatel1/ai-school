

## Diagnosis

The `preloadVoices()` function already runs on mount, but it speaks an **empty string** (`""`), which on many browsers (especially Edge with Natural voices) doesn't actually initialize the neural voice engine. The real delay happens on the **first non-empty utterance** when the engine cold-starts the neural model.

Additionally, `startShadowRecording` calls `await startMediaRecorder()` **before** calling `speak()`, and `getUserMedia` permission prompts / stream setup adds latency before TTS even begins.

## Plan — `src/lib/tts-provider.ts` + `src/pages/SpeakingStudio.tsx`

### 1. Improve warm-up utterance (tts-provider.ts)
- Change the silent warmup from empty string `""` to a single space `" "` or a short word like `"."` — empty strings are often skipped entirely by the speech engine.
- Add a second warm-up that specifically primes the **accent voice** the user has selected, not just whichever voice is cached first.

### 2. Add accent-specific preload (tts-provider.ts)  
- New export: `preloadAccent(accent: Accent)` that speaks a silent utterance with the specific accent voice. Call this when the accent selector changes and on mount with the default accent.

### 3. Reorder shadowing start (SpeakingStudio.tsx)
- In `startShadowRecording`, call `speak()` **first** (fire-and-forget), then `await startMediaRecorder()` in parallel. The TTS engine starts immediately while the mic initializes concurrently.
- Use `Promise.all` or fire TTS before awaiting mic so both initialize simultaneously.

### 4. Call accent-specific preload on mount and accent change (SpeakingStudio.tsx)
- Replace `preloadVoices()` with `preloadAccent(accentLower)` in the mount effect.
- Add a second effect that calls `preloadAccent(accentLower)` whenever accent changes.

