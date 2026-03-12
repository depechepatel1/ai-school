

## Bug Analysis

### Bug 1: Pause markers disappearing (flip-flopping text)

**Root cause**: The `debouncedPunctuate` callback sends `currentTranscriptRef.current` (which contains `⟦1.8s⟧` markers) to the AI punctuation edge function. The AI strips these markers since they're not English text. When the punctuated result returns, `setLiveTranscript(punctuated)` overwrites the display with marker-free text. Then on the next STT chunk, `setLiveTranscript(currentTranscriptRef.current.trimStart())` restores the markers — causing the flip-flop.

**Fix**: Before sending text to the punctuation API, strip pause markers from the input. When the result comes back, re-inject the markers at their original positions. Concretely:

In `SpeakingPractice.tsx`, modify the `debouncedPunctuate` callback (line 115-118):
- Before calling punctuate, extract all `⟦...s⟧` markers and their positions
- Send only the clean text to the API
- When the result returns, re-inject the markers at the correct positions
- A simpler approach: keep `currentTranscriptRef` as the source of truth (it already has markers). Only punctuate the non-marker segments. When punctuation returns, merge the punctuated text back with the markers preserved.

Simplest reliable fix: strip markers before sending, then after punctuation returns, don't use the punctuated text to replace markers — instead, update `currentTranscriptRef` by applying punctuation only to the text segments between markers, then set `liveTranscript` from the ref.

**Implementation**: Create a helper `stripPauseMarkers(text)` and `reinsertPauseMarkers(punctuated, original)` in `speech-annotations.ts`. The debounced punctuate wrapper will:
1. Strip markers from `currentTranscriptRef.current`
2. Send stripped text to punctuate API  
3. On result, re-insert markers at their original relative positions
4. Update both `currentTranscriptRef.current` and `setLiveTranscript`

### Bug 2: Recording gets stuck (can't restart)

**Root cause**: When STT errors occur (e.g., `no-speech`, `network` errors from Web Speech API), the `onError` callback sets `recordingState` to `"idle"` but does NOT clean up the media recorder or speech tracker. The media recorder stream stays open, and subsequent `startRecording` calls may fail silently because `getUserMedia` or `MediaRecorder` is still active.

Additionally, the `onAutoPause` callback calls `finishRecording()` which is defined inside the component but captured in a stale closure from the `useEffect([], [])` — it captures the initial `finishRecording` reference, which has stale state values for `currentQuestion`, `conversationHistory`, etc.

**Fix**:
1. Add proper cleanup to the `onError` handler — stop media recorder, reset speech tracker
2. Fix the stale closure: use a ref for `finishRecording` so the `onAutoPause` callback always calls the latest version
3. Add error recovery: if `startRecording` is called while resources are still active, clean them up first

### Files to Edit

1. **`src/lib/speech-annotations.ts`** — Add `stripPauseMarkers()` and `reinsertPauseMarkers()` helpers
2. **`src/components/practice/SpeakingPractice.tsx`** — Fix punctuation to preserve markers; fix error handling cleanup; fix stale closure for `finishRecording`; add cleanup guard in `startRecording`
3. **`src/hooks/useSpeakingTest.ts`** — Apply same marker-preservation fix if it uses `debouncedPunctuate` with pause markers

