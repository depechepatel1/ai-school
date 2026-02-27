

## Root Cause

The adaptive peak tracker in `LiveInputCanvas` (lines 411-417) ratchets upward aggressively but barely decays:

```
rise:  peakAmp = peakAmp * 0.7 + rms * 0.3   (fast)
decay: peakAmp = peakAmp * 0.999 + rms * 0.001 (nearly frozen)
```

After the user's first loud syllable, `peakAmp` locks high. All subsequent frames produce `normAmp ≈ 0`, flattening the line.

## Fix

**File: `src/components/speaking/PronunciationVisualizer.tsx`** — Two changes in the amplitude normalization section (lines 407-420):

1. **Faster peak decay** — change decay blend from `0.999/0.001` to `0.98/0.02` so `peakAmp` tracks the user's current dynamic range rather than locking to a historical maximum.

2. **Minimum normAmp floor** — add a small floor (e.g. `0.08`) when voice is detected (rms above noise floor), so even quiet speech produces visible oscillation instead of going flat.

Single file, two adjacent line edits.

