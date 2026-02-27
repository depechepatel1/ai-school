

## Plan: Animate Cyan Line + Maximize User Line Vertical Motion

### 1. Cyan target line — progressive reveal during playback

Currently the entire cyan contour is drawn statically. Change it so during `isPlaying`, only the portion up to the current progress is drawn:

- Clip the contour path to `0..prog*w` so the line "propagates" left-to-right as the computer reads
- The progress dot rides the contour at the correct Y position (interpolated from points), not fixed at `h/2`
- When not playing, draw the full contour as before

### 2. User's green line — dramatically more vertical undulation

The line is nearly flat because RMS values are tiny and the Y calculation centers around `h/2`. Fix by:

- **Increase amplitude multiplier** from `80` to `200` — captures even quiet speech as significant movement
- **Expand vertical range** from `0.7` to `0.9` — line can reach within 5% of top/bottom borders
- **Reduce padding** from `10px` to `5px` min/max clamp
- **Reduce smoothing** from `0.4/0.6` to `0.2/0.8` — much more reactive to frame-by-frame changes
- **Add frequency-based wobble**: layer a secondary oscillation from the audio's spectral centroid to add natural undulation even at steady volumes
- **Simulation fallback**: increase sim amplitude range from `0.4` to `0.9` and reduce sim smoothing from `0.9/0.1` to `0.5/0.5`

### Technical details

**Cyan progressive reveal** — in `draw(prog)`:
```
// Only stroke points up to prog * w
const visibleCount = Math.ceil(prog * points.length);
// Draw path for points[0..visibleCount-1] only
// Place dot at the last visible point's actual Y, not h/2
```

**Green line amplitude**:
```
const amp = Math.min(1, rawAmp * 200);
let y = h / 2 - amp * h * 0.9;
// Add spectral wobble
const freqData = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(freqData);
const centroid = computeSpectralCentroid(freqData);
y += Math.sin(Date.now() * 0.015) * centroid * h * 0.15;
// Less smoothing
y = prev * 0.2 + y * 0.8;
y = Math.max(5, Math.min(h - 5, y));
```

### Files changed
- `src/components/speaking/PronunciationVisualizer.tsx`

