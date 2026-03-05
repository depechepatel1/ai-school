

## Plan: Clean Up Video Player Code in PageShell

### Problem Diagnosis

1. **MIME type was broken** — The re-upload process stored videos as `application/octet-stream`. I just ran the edge function to re-upload all 10 files with `contentType: "video/mp4"`. This should fix the `MEDIA_ERR_SRC_NOT_SUPPORTED` (error code 4) you're seeing. **A hard refresh (Ctrl+Shift+R) in Edge may be needed** to bust the CDN/browser cache.

2. **Player code has accumulated cruft** — Multiple rewrites have left fragile logic. The A/B dual-player approach is correct and necessary for gap-free transitions, but the implementation has issues.

### Current Issues in the A/B Player

- `onCanPlay` callbacks call `safePlay` on every `canplay` event, not just the first — this can cause race conditions and double-play attempts
- `handlePlayerEnded` uses a `videoIndexRef` that drifts because it increments by 1 but represents an offset from initial, while preload calculates `currentIndex + 2` — this works but is hard to reason about
- The `chatOpen` state and `OmniChatModal` are unused (chat button was removed but state remains)
- The intro video fading logic adds unnecessary complexity to the className of the loop players

### Cleanup Plan

**File: `src/components/PageShell.tsx`**

1. **Remove dead chat state** — Delete `chatOpen`/`setChatOpen` state, the `OmniChatModal` import and render, since no button triggers it.

2. **Simplify A/B player index tracking** — Replace the `videoIndexRef` with a clearer `nextIndexRef` that directly tracks which video index to play next. Initialize to 1 (since A starts with index 0).

3. **Fix `onCanPlay` to only auto-play on initial load** — Use a ref flag (`initialPlayDone`) so `onCanPlay` on Player A only triggers `safePlay` once on mount, not on every buffer event. Remove `onCanPlay` from Player B entirely (it only needs to play when swapped to via `handlePlayerEnded`).

4. **Simplify `handlePlayerEnded`** — Rewrite to:
   - Swap active player
   - Play the next player (already preloaded)
   - Set the now-inactive player's `src` to the next-next video and call `.load()`
   - Increment `nextIndexRef` with modular wrap

5. **Remove intro opacity class from loop players** — The intro video already covers them via z-index. The conditional `opacity-0` class on the A/B players when intro is playing is unnecessary since the intro video sits on top.

6. **Keep the `safePlay` helper** — The 150ms retry is genuinely needed for Edge's autoplay policy quirks.

### Result
A cleaner, more predictable A/B player with fewer state variables and no dead code. The dual-player z-index swap architecture is preserved as the correct solution for seamless transitions.

### Files Changed
- `src/components/PageShell.tsx` — remove dead code, simplify player logic

