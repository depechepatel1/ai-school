

## Fix: TTS Timing Crashes During 300-Chunk Pronunciation Measurement

### Problem
The browser page refreshes/crashes before all 300 pronunciation chunks are timed. Even on Edge (which has better speech synthesis stability than Chrome), processing 300 utterances continuously overwhelms the speech engine.

### Root Cause
The current code processes all chunks in a tight loop with only 200ms between utterances. Edge's speech engine accumulates internal state and eventually crashes or becomes unresponsive, causing the page to reload.

### Solution — Batch Processing with Engine Reset

Changes to **`src/lib/tts-measure.ts`**:

1. **Batch chunks into groups of 15** — after each batch, cancel the speech engine and wait 2 seconds for it to fully reset
2. **Increase inter-utterance delay** from 200ms to 500ms
3. **Add a keepalive interval** — call `speechSynthesis.pause()` then `speechSynthesis.resume()` every 10 seconds to prevent the engine's internal idle timeout from killing it mid-utterance
4. **Retry on timeout** — if a single utterance returns the timeout value (meaning the engine hung), retry it once after a 1-second reset pause

### Technical Detail

```text
Current flow:
  chunk1 → 200ms → chunk2 → 200ms → chunk3 → ... → chunk300
  (engine crashes around chunk 40-80)

New flow:
  [batch 1: chunks 1-15] → 500ms gaps → 2s REST + engine reset
  [batch 2: chunks 16-30] → 500ms gaps → 2s REST + engine reset
  ...
  [batch 20: chunks 286-300] → done

  + keepalive ping every 10s throughout
  + single retry if any utterance times out
```

### File Changes
- **`src/lib/tts-measure.ts`** — restructure `measureAllChunkDurations` with batch loop, keepalive interval, retry logic, and longer delays

