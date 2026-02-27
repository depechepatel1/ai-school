

## Problem

The current implementation uses a **single `<video>` element** whose `src` attribute changes on each `onEnded` event. When `setCurrentVideoIndex` triggers a re-render with a new `src`, the browser tears down the old video, loads the new one, and there's a visible flash (black frame) during the transition.

## Solution: Dual-Video Crossfade

Use **two stacked `<video>` elements** (A and B) that alternate. When video A ends, video B (already preloaded with the next source) fades in while A fades out. Then B becomes the "active" player and A preloads the following video.

## Implementation

### File: `src/components/PageShell.tsx`

1. **Add a second video ref** (`loopRefB`) and a state to track which player is active (`activePlayer: "A" | "B"`)
2. **Preload the next video** into the inactive player as soon as the active one starts playing
3. **On `onEnded`** of the active player:
   - Swap `activePlayer` state (A→B or B→A)
   - Start playback on the now-active player (already preloaded)
   - Load the *next-next* video into the now-inactive player
4. **CSS crossfade**: Both videos are `absolute inset-0`, the active one gets `opacity-100` and the inactive gets `opacity-0`, with `transition-opacity duration-700` for a smooth blend
5. Keep the existing intro video logic unchanged — it only affects the initial intro-to-loop transition

### Key state changes:
```text
activePlayer: "A" | "B"        // which video element is currently visible
videoIndexA: number             // src index for player A
videoIndexB: number             // src index for player B
```

### Transition flow:
```text
A playing (idx 0) → A ends → B starts (idx 1, preloaded) → fade A out, B in
B playing (idx 1) → B ends → A starts (idx 2, preloaded) → fade B out, A in
...
```

No other files need changes.

