
Implementation plan (forensic fix in `src/components/speaking/PronunciationVisualizer.tsx`):

1) Remove user-line opacity decay (keep full line visible)
- Eliminate trailing fade logic in `drawLine()`:
  - remove `TRAIL` usage
  - remove per-segment `opacity` calculation
  - stop setting `ctx2d.globalAlpha` per segment
- Keep stroke fully opaque across the entire history so old segments remain as visible as new segments for direct comparison to the target contour.

2) Harden late-session amplitude normalization (fix flattening after ~75%)
- Add a short rolling RMS window in live state (recent frames only).
- Compute dynamic low/high bounds from that rolling window each frame (instead of relying only on long-memory EMA peak behavior).
- Normalize against rolling bounds, keep a speech-active floor, and clamp safely to avoid denominator collapse.
- This prevents early loud syllables from suppressing later quieter syllables.

3) Further smooth oscillations without damping them flat
- Add smoothing at the input-feature level:
  - smoothed amplitude envelope
  - smoothed spectral centroid
- Use those smoothed features in displacement math.
- Keep Y-smoothing moderate (not heavy), so curves look more fluid while preserving depth.

4) Prevent timeline compression side-effects that visually look like flattening
- Increase `maxDur` mapping so line progression across X better matches real speaking pace.
- Clamp progress/index lookups safely near the end of the sentence to avoid unstable final-quarter behavior.

5) Validation pass
- Record a full sentence with normal + quieter ending.
- Confirm:
  - no fade in earlier user segments (full opacity preserved)
  - oscillations remain active through final quarter
  - motion looks smoother (no jagged spikes, no over-damped flatline).

Technical details (constants/logic to apply):
- Remove:
  - `const TRAIL = ...`
  - `const opacity = Math.max(0.15, 1 - distFromHead / TRAIL)`
  - `ctx2d.globalAlpha = opacity`
- Add state fields:
  - `rmsWindow: number[]`
  - `smoothAmp: number`
  - `smoothCentroid: number`
- Add small percentile helper for rolling window bounds.
- Suggested tuning targets:
  - rolling window: ~72–96 frames
  - speech floor after normalization: ~0.12–0.16
  - feature smoothing:
    - amp: ~0.70/0.30
    - centroid: ~0.80/0.20
  - Y smoothing: ~0.58/0.42
  - `maxDur`: raise from current baseline to better fit slower utterances (e.g. `Math.max(5000, totalSyl * 500)`).
