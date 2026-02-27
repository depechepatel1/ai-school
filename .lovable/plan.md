

## Performance Optimization Plan — PronunciationVisualizer.tsx

Incorporating the Gemini suggestions where they genuinely improve on the current approach, while preserving the app's existing visual design (green/red mismatch colors, bezier-style curves, gradient fills, glow effects).

### Fix 1: Peak Envelope Follower (replace array sort)
Replace the `rmsWindow[]` array + per-frame `.sort()` (line 440-447) with an O(1) peak envelope tracker:
- **Fast attack**: if `rms > peakAmp`, snap instantly to new peak
- **Smooth decay**: otherwise `peakAmp *= 0.95`
- Normalize as `normAmp = rms / peakAmp`
- Delete `rmsWindow` from state, remove `RMS_WINDOW_SIZE` constant
- Keeps the amplitude floor logic for quiet speech visibility

### Fix 2: Ring buffer + batched path (replace unbounded history)
Replace `history: HistoryPt[]` with a pre-allocated ring buffer:
- `Float32Array(MAX_POINTS * 3)` storing `[x, y, mismatch]` triples, `MAX_POINTS = 600`
- Ring index wraps at `MAX_POINTS`, zero memory growth
- In `drawLine()`, batch into a single `ctx.beginPath()` path using `lineTo` + `lineJoin = 'round'` instead of per-segment `bezierCurveTo` with individual `beginPath/stroke` calls (current code creates ~600 separate path objects per frame)
- Keep the mismatch color split: draw two passes (green segments, red segments) using the ring buffer
- Cache the fill gradient; recreate only on resize

### Fix 3: Single master RAF loop
Lift the animation loop into the parent `PronunciationVisualizer` component:
- One `requestAnimationFrame` loop drives both canvases on the same V-Sync tick
- Pass render callbacks via refs from each child canvas
- Eliminates dual-loop micro-stutters and ensures target + user lines are perfectly synchronized

### Fix 4: ResizeObserver + cached dimensions
Replace per-frame `getBoundingClientRect()` calls in both canvases:
- Single `ResizeObserver` on the parent container, stores `w`/`h` in a ref
- `setupCanvas` only runs when dimensions actually change
- DPR scaling already handled correctly (lines 56-68)
- Cache gradient objects, recreate only on resize

### Fix 5: `desynchronized` canvas context
Add `{ desynchronized: true }` to `getContext('2d')` calls for lower-latency rendering on supported devices (iPads, Chrome).

### What we preserve (not changing)
- The mismatch red/green color system
- Glow/shadow effects on the line and head dot
- The gradient fill beneath the user line
- The target contour canvas bezier curves (only ~20-40 points, not a bottleneck)
- `ampHistory` array for `onPitchContour` callback (needed for scoring)
- Auto-stop silence detection logic

### Files changed
- `src/components/speaking/PronunciationVisualizer.tsx` — single file, full rewrite of internals

