

## Plan: Reinstall Original Visualizer Logic

### What the original code does differently

The uploaded file contains two separate canvas components stacked in the same container:

1. **TargetContourVisualizer** — Draws a static prosody contour line (cyan) from syllable data. No mic, no timing sync needed. It maps `pitch === 2` to top, `pitch === -1` to bottom, neutral to middle. Optionally animates a progress dot when `isPlaying` is true.

2. **LiveInputVisualizer** — Uses mic RMS amplitude (volume), NOT pitch detection. Maps `rawAmp * 30` to a 0-1 scale, smooths heavily (0.85/0.15 blend), draws a green line with mismatch detection against prosody expectations. Has auto-stop after 2s silence. Has a simulated fallback if mic access denied.

### Key differences from current implementation
- Original uses **two separate canvases** layered on top of each other, not one canvas with two line histories
- Original live line uses **volume (RMS)** not pitch (F0) — simpler, more responsive, fewer false negatives
- Original target line is **fully static** (drawn once from prosody data), not animated word-by-word from TTS `onBoundary` events
- Original auto-stop is 2 seconds, current is 1 second
- Original has a **simulate fallback** when mic is denied
- No dependency on `pitchy` library

### Implementation steps

1. **Rewrite `PronunciationVisualizer.tsx`** to contain two internal canvases matching the original logic:
   - `TargetContourVisualizer`: static prosody line drawn once from `prosodyData`, with animated progress dot when `isPlayingModel`
   - `LiveInputVisualizer`: mic RMS-based amplitude line with smoothing, mismatch detection, auto-stop (2s), and simulation fallback
   - Both rendered as overlapping `<canvas>` elements inside a single wrapper div

2. **Update props** to match what `SpeakingStudio.tsx` already passes (no changes needed to SpeakingStudio — the props interface stays the same: `isRecording`, `isPlayingModel`, `activeWordIndex`, `prosodyData`, `onAutoStop`, `onPitchContour`)

3. **Remove `pitchy` dependency** — the original doesn't use pitch detection at all, just volume amplitude

### Technical details

Target line Y-mapping (from original):
```
pitch === 2  → h * 0.2  (high)
pitch === -1 → h * 0.8  (low)
else         → h * 0.7  (neutral)
```

Live line amplitude mapping (from original):
```
rawAmp = sqrt(sum of squared samples / length)
amp = min(1, rawAmp * 30)
y = (h/2) - (amp * h * 0.45)
smoothed: y = prev * 0.85 + new * 0.15
```

Mismatch detection (from original):
```
if high pitch syllable && amp < 0.2 → mismatch
if not high pitch && amp > 0.6 → mismatch
```

Auto-stop: 2 seconds of silence (rawAmp < 0.02), no `hasSpoken` gate in original.

