

## Issues Identified

### 1. Auto-stop not triggering
The silence detection initializes `silenceStartRef = Date.now()` immediately on recording start, but there's no "has spoken" gate. Background mic noise (rawAmp > 0.02) constantly resets the timer, so silence is never detected. The fix: track whether the user has actually spoken (rawAmp above a speech threshold ~0.05), and only start the silence countdown after speech has been detected.

### 2. Flickering artifact across top of canvas
The "static render" effect (lines 354-385) runs when `isRecording`/`isPlayingModel` change and **resizes the canvas** (`canvas.width = ...`), which clears it. This conflicts with the active animation loop. Each resize flash causes a flicker. Fix: only resize the canvas if dimensions actually changed, and skip redundant resizes.

### 3. Lines flat and stuck in top half
Two causes:
- **Amplitude multiplier too high** (`rawAmp * 50`): most speech saturates to amp ≈ 1.0, so the line stays near the top
- **Heavy smoothing** (`0.85 * lastY + 0.15 * newY`): flattens all movement
- **Y formula** `(h/2) - (amp * h * 0.45)`: with amp near 1.0, y ≈ 5% of canvas height (top)

Fix: reduce multiplier to ~8, reduce smoothing to 0.6/0.4, and center the idle line at midline so speech deflects both up and down visually.

## Changes — `src/components/speaking/PitchCanvas.tsx`

1. **Add `hasSpokenRef`**: boolean ref, starts false. Set true when rawAmp exceeds 0.05. Only check silence timeout when hasSpokenRef is true.

2. **Reduce amp multiplier**: `rawAmp * 50` → `rawAmp * 8` for both live draw and target synthetic fallback, so typical speech sits mid-canvas instead of pinned to top.

3. **Reduce smoothing**: `0.85/0.15` → `0.6/0.4` for more responsive line movement.

4. **Fix canvas resize flicker**: In the static render effect, check if canvas dimensions match before setting `canvas.width`/`canvas.height` — only resize when the container actually changed size.

5. **Same changes to target line**: Match the reduced smoothing on the cyan line so both remain identical in behavior.

