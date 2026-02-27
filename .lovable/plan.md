

## Plan: Align Prosody Text Vertical Position with Contour Peaks/Troughs

### Problem
Currently, the ProsodyVisualizer uses fixed `translateY` offsets (-20px for stressed, -8px for medium, 0 for unstressed). These don't match the 4-tier Y-mapping in the target contour (15%, 35%, 60%, 80%). Yellow words should sit at the top (peaks) and gray words at the bottom (troughs).

### Changes

**File: `src/components/speaking/ProsodyVisualizer.tsx`**

1. Increase the container height to allow more vertical range (e.g. `min-h-[8rem]` or more) and use `items-start` instead of `items-center` so words can freely move vertically.

2. Remap the `translateY` values to mirror the contour's 4-tier system within the container:
   - **Pitch 2 + Stress 2** (yellow words → peaks): `translateY(0px)` — top of container
   - **Pitch 2 only** (white words → secondary peaks): `translateY(~25px)`
   - **Pitch 0 / baseline** (neutral): `translateY(~50px)`
   - **Pitch -1** (gray words → troughs): `translateY(~70px)`

3. Apply these per-syllable, so within a multi-syllable word the stressed syllable rises to the peak while trailing syllables descend to troughs — matching the contour line's shape exactly.

### Result
The prosody text will undulate vertically in sync with the contour line below it: yellow stressed syllables at the top, gray unstressed syllables at the bottom, creating a visual connection between the karaoke text and the waveform.

