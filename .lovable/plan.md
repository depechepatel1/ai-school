

## Problem

The karaoke highlight (`activeWordIndex`) advances via `SpeechSynthesisUtterance.onboundary` events. However:

- **Chrome** with Google voices: `onboundary` never fires
- **Safari**: `onboundary` never fires  
- **Edge** with Microsoft Natural voices: works correctly

Since most users are on Chrome, the highlight stays stuck at word 0.

## Solution: Timer-based fallback

When `onBoundary` doesn't fire within the first ~500ms of speech, fall back to a timer that estimates word positions based on syllable count and speech rate.

### Changes

**1. `src/lib/tts-provider.ts`** — Add boundary-fire detection + synthetic boundary emission

In `browserSpeak`, track whether a real `onboundary` fires. If not, start a timer that calls `onBoundary` with estimated character positions derived from word lengths and the utterance rate.

Add a helper `estimateWordTimings(text, rate)` that:
- Splits text into words
- Estimates each word's duration proportional to character count
- Returns `{ charIndex, timeMs }[]` for each word start

In the `utterance.onstart` handler, set a 400ms timeout. If no real boundary has fired by then, start a `setInterval` that walks through the estimated timings and calls `opts.onBoundary(charIndex)` at the right moments.

Cancel the fallback timer in `onend`, `onerror`, and `stop()`.

**2. No changes to practice screens or ProsodyVisualizer** — they already react to `activeWordIndex` correctly. The fix is entirely in the TTS layer.

### Implementation detail

```text
estimateWordTimings("Put your blue shoes in the cool room", rate=0.8)
→ [
    { charIndex: 0,  timeMs: 0 },      // "Put"
    { charIndex: 4,  timeMs: 375 },     // "your"
    { charIndex: 9,  timeMs: 875 },     // "blue"
    ...
  ]
```

The interval checks `elapsed >= timing.timeMs` and fires the callback. Total duration is estimated as `(text.length * 65) / rate` ms (tunable).

This approach:
- Preserves real `onBoundary` when available (Edge)
- Falls back gracefully on Chrome/Safari
- No new dependencies
- Single file change

