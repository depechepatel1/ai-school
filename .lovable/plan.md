

## Problem Analysis

The scoring system has several fundamental issues causing a native speaker to get only ~50%:

1. **Target contour uses arbitrary pitch levels (0.2, 0.5, 0.8)** from prosody heuristics, while the **user contour uses actual Hz frequencies normalized to 0-1 (80-600Hz range)**. These are completely different scales — they'll never match well via DTW.

2. **The prosody parser is a crude heuristic** — it guesses stress from suffix patterns (e.g. "-tion", "-ic") and assigns discrete pitch levels (0, -1, 2). Real English prosody is far more complex and speaker-dependent.

3. **DTW is comparing apples to oranges**: the target contour has ~2 points per syllable (very short), while the user contour has potentially hundreds of pitch samples from real-time tracking. The length mismatch alone degrades DTW scoring.

4. **The scoring formula is too harsh**: `(1 - avgDist * 2) * 100` means any average distance above 0.5 results in 0%. Since the two contours are on fundamentally different scales, even good speech gets penalized.

## Proposed Approach

Rather than trying to fix the broken pitch-to-pitch comparison, **switch to a relative contour shape comparison**:

### 1. Normalize both contours to the same relative scale
- Convert both contours to **relative pitch movement** (delta between consecutive points) instead of absolute values
- Z-score normalize both contours (subtract mean, divide by std dev) so they're scale-independent
- Resample both to the same number of points before comparing

### 2. Use a more forgiving scoring formula
- Reduce the DTW penalty multiplier so native speakers consistently score 80-95%
- Add a correlation-based component (Pearson correlation of contour shapes) which is naturally scale-independent
- Blend DTW + correlation for the final score

### 3. Improve the target contour generation
- Add more points per syllable with smooth interpolation between stress levels
- Use a gentler pitch range (0.3-0.7 instead of 0.2-0.8) since we're comparing shapes, not absolute values

### 4. Add tolerance for timing differences
- The current DTW already handles timing, but resample both contours to a fixed length (e.g., 50 points) before comparison to reduce noise from different recording durations

## Files to Modify

- **`src/lib/contour-match.ts`** — Add resampling, z-score normalization, correlation scoring, blend with DTW, fix scoring formula
- **`src/lib/speech-analysis-provider.ts`** — Use improved matching in `analyzeContour()`

## Technical Details

### contour-match.ts changes:
```text
+ resampleContour(contour, targetLen) → number[]    // linear interpolation to fixed length
+ zNormalize(contour) → number[]                     // (x - mean) / stddev
+ pearsonCorrelation(a, b) → number                  // -1 to 1 correlation
+ Updated matchContours:
    1. Resample both to 50 points
    2. Z-normalize both
    3. DTW score (with gentler formula: 1 - avgDist * 0.8)
    4. Pearson correlation score
    5. Blend: 0.4 * dtwScore + 0.6 * correlationScore
    6. Apply floor: native speakers should get 75-95%
```

### Scoring formula change:
```text
Before: score = (1 - avgDist * 2) * 100     → harsh, 50% average distance = 0%
After:  score = (1 - avgDist * 0.8) * 100   → gentler, blended with correlation
```

