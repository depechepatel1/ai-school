

## Fix: Pronunciation Timing Still Crashes on Edge

### Analysis

The batching fix added Chrome-specific workarounds that likely conflict with Edge's speech synthesis implementation:

1. **Keepalive interval is the probable culprit** — The `speechSynthesis.pause()` / `speechSynthesis.resume()` ping every 10 seconds is a Chrome-specific hack. Edge's speech engine doesn't have Chrome's 15-second idle timeout, but it *does* react badly to `pause()`/`resume()` being called while the engine is actively processing or between `cancel()`/`speak()` transitions. This can crash the renderer process, causing a full page reload.

2. **Fluency worked because it has fewer items** — With fewer chunks, the total measurement time is shorter, meaning fewer keepalive pings fire, reducing the chance of a collision.

### Solution

Changes to **`src/lib/tts-measure.ts`**:

1. **Remove the keepalive interval entirely** — Edge doesn't need it, and it actively harms stability. Replace with a simple engine reset between batches (already done via `speechSynthesis.cancel()`).
2. **Reduce batch size from 15 to 10** — More frequent engine resets reduce accumulated state.
3. **Increase batch rest from 2s to 3s** — Give Edge's engine more recovery time.
4. **Add a pre-batch engine warm-up** — Speak an empty/short utterance at the start of each batch to ensure the engine is alive before measuring.

### File Changes
- **`src/lib/tts-measure.ts`** — Remove keepalive interval, adjust batch size and rest timing, add engine warm-up

