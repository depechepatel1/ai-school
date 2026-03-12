

## Plan: Instant-start, zero-flicker, randomized video loop

### Problems
1. **Slow first load** — all 10 videos share bandwidth; clip 1 competes with prefetching.
2. **Flicker on transition** — `transition-opacity duration-500` fades between clips, causing a visible flash.
3. **Sequential order** — clips always play 1→2→3→…→10→1→… which gets repetitive.

### Design

Since first and last frames of all clips are identical, we can do **instant z-index swaps with no opacity transition**. Both players stay at `opacity-100` at all times. The active player sits at `z-[2]`, the standby at `z-[1]`. When the active clip ends, we instantly flip z-indices and call `play()` on the standby — the identical frames make the cut invisible.

**Randomization**: Build a shuffled playlist on mount (Fisher-Yates), always starting with index 0 (the clip already set as `src` on Player A). Pick the next clip from the shuffled list. When the list is exhausted, reshuffle.

**Fast first load**: Player A gets `preload="auto"` and starts playing immediately. Player B only loads after Player A starts playing (via `onPlaying` or the intro-finished effect), so it doesn't compete for bandwidth.

### Changes — single file: `src/components/stage/VideoLoopStage.tsx`

**1. Add shuffle utility**
```ts
function shuffleExceptFirst(arr: string[]): string[] {
  const first = arr[0];
  const rest = arr.slice(1);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [first, ...rest];
}
```

**2. Replace `nextIndexRef` with a shuffled queue ref**
- On mount, create `playlistRef = useRef(shuffleExceptFirst(videoList))` and `playIndexRef = useRef(1)` (index 0 is already on Player A).
- Helper `getNextClip()`: returns `playlist[playIndex++]`, reshuffles when exhausted.

**3. Remove all opacity transitions — instant swap only**
- Both `<video>` elements: remove `transition-opacity duration-500`, keep both at `opacity-100`.
- Active player: `z-[2]`. Standby: `z-[1]`.
- Since frames match, the cut is invisible.

**4. Defer Player B loading**
- Don't set Player B's `src` until Player A fires `onPlaying` or intro finishes.
- In the intro-finished `useEffect`, preload B with `getNextClip()`.

**5. Instant swap in `handlePlayerEnded`**
- When Player A ends: set active to B, call `play()` on B immediately (it's already loaded and at `readyState >= 2`).
- Then set Player A's `src` to `getNextClip()` and call `.load()` to preload the next clip.
- No `await canplay` gating — the clip should already be ready since it was preloaded during the previous clip's full playback duration.
- Keep a fallback: if `readyState < 2`, wait for `canplay` before swapping (safety net for slow connections).

