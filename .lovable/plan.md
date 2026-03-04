

## Forensic Analysis: Edge Video Playback Bug

### Root Cause

After reviewing `PageShell.tsx`, I've identified multiple issues that would cause Edge to fail playing the video stack:

1. **Dead ping-pong code still present (lines 71-92)**: Although `pingPong` defaults to `false` and the effect returns early, its presence in the dependency array (`activePlayer`) means Edge's stricter media lifecycle handling may be affected by the effect mounting/unmounting on every player swap.

2. **`play()` called before new source is loaded**: When players swap (e.g., line 201-203 and 237-239), `setVideoIndexA(nextNext)` changes the `src` via React state, but `play()` is called on the *other* player in the same handler. The problem: when that other player gets its *next* turn and its src has been swapped by React, Edge requires the video to be fully loaded before `play()` succeeds. Chrome is lenient; Edge rejects the promise silently (caught by `.catch(() => {})`).

3. **`muted` not re-applied after src change**: The muted-fix effect (lines 96-108) only runs on `[introFinished, bgImage, activePlayer]` — **not** on `videoIndexA`/`videoIndexB`. When a video element gets a new `src`, Edge resets the muted state, violating autoplay policy.

4. **Player B has no `autoPlay` attribute** (line 223): It relies entirely on explicit `play()` calls, which fail in Edge if the video isn't loaded yet.

### Fix Plan

**File: `src/components/PageShell.tsx`**

1. **Remove the entire ping-pong effect** (lines 71-92) and the `pingPongDir`/`lastFrameTime` refs (lines 67-68). Also remove `pingPong` from the props interface since it's unused.

2. **Add `onCanPlay` handlers to both players** that call `play()` when the player is the active one — this guarantees Edge plays after a src swap:
   ```tsx
   // Player A
   onCanPlay={() => {
     if (introFinished && activePlayer === "A" && loopRefA.current) {
       loopRefA.current.muted = true;
       loopRefA.current.play().catch(() => {});
     }
   }}
   // Player B
   onCanPlay={() => {
     if (activePlayer === "B" && loopRefB.current) {
       loopRefB.current.muted = true;
       loopRefB.current.play().catch(() => {});
     }
   }}
   ```

3. **Force `muted = true` via ref before every `play()` call** in the swap handlers (lines 201, 209, 237, 245) — not just in the effect. Edge requires this for autoplay compliance.

4. **Add `videoIndexA` and `videoIndexB` to the autoplay effect dependencies** (line 108) so the muted fix re-applies after src changes.

These changes remove dead code, fix Edge's strict autoplay enforcement, and ensure videos always play after source swaps.

