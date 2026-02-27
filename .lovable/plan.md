

## Analysis

The prosody line and karaoke text both consume the same `WordData[]` from `parseProsody()`, but they map pitch/stress to vertical position differently:

**Karaoke text** (ProsodyVisualizer) uses 3 tiers:
- `pitch=2 + stress=2` → big rise (-20px), large bold text
- `pitch=2` only → small rise (-8px), semibold
- everything else → baseline (0px)

**Canvas contour** (TargetContourCanvas) uses a different 3-tier mapping:
- `pitch=2` → `h * 0.2` (high, no stress distinction)
- `pitch=-1` → `h * 0.8` (low)
- neutral → `h * 0.7` (slightly low)

The canvas ignores the `stress` field entirely, so a high-pitch+high-stress syllable (which the karaoke text makes huge and yellow) looks identical to a plain high-pitch syllable on the contour. The neutral/falling tiers also don't match.

## Plan

**File: `src/components/speaking/PronunciationVisualizer.tsx`** — Update the Y-mapping in `TargetContourCanvas` (line 94-97) to mirror the karaoke text's 4-tier hierarchy:

```
pitch=2 + stress=2  →  h * 0.15  (highest peak — matches big karaoke rise)
pitch=2             →  h * 0.35  (moderate rise — matches small karaoke rise)  
neutral (pitch=0)   →  h * 0.60  (baseline — matches karaoke baseline)
pitch=-1            →  h * 0.80  (dip — post-stress fall)
```

This is a single mapping change at line 94-97 where `points` are computed, adding the `s.stress` check to differentiate the two high-pitch tiers. No other files need changing.

