

## Problem

Each video clip has a repeated/frozen frame in the first and last ~250ms. Even with the dual-video crossfade, this creates a visible stutter because the crossfade blends between two identical frames (the tail of clip A and the head of clip B).

## Solution: Trim Heads and Tails in Code

Since every clip shares this property, we can programmatically skip the dead frames:

### File: `src/components/PageShell.tsx`

1. **Seek past the head on load**: Add an `onLoadedData` handler to both Player A and Player B that sets `currentTime = 0.3` (slightly past the frozen frame) before playback begins. This ensures the first visible frame is always "live" content.

2. **End early before the tail**: Instead of waiting for the native `onEnded` event, use a `timeupdate` listener that checks if `currentTime >= duration - 0.3`. When this threshold is hit, immediately trigger the crossfade swap and start the other player. This cuts away before the frozen tail frame is ever shown.

3. **Crossfade timing**: The 700ms opacity transition already covers the ~300ms we're trimming, so the blend will mask any remaining edge artifacts completely.

### Implementation detail

```text
onLoadedData → seek to 0.3s
onTimeUpdate → if (currentTime >= duration - 0.3) → trigger swap
```

No changes to any other files. The trim values (0.3s) can be defined as a constant `TRIM_SECONDS` at the top of the file for easy tuning.

