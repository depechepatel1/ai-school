

## Forensic Analysis

Three compounding issues cause the second-half flattening:

1. **Peak decay still too slow** — `peakAmp` blend at `0.98/0.02` (line 434) means after a loud first half, peak takes ~50 frames to halve. Quieter second-half speech produces near-zero `normAmp`.

2. **Over-dampened smoothing** — The `0.66/0.34` EMA (line 480) aggressively flattens Y movement. Combined with shrinking `normAmp`, the line converges to midline.

3. **Insufficient displacement range** — `drawableRange * 0.60` (line 476) caps vertical swing at 60% of canvas height, leaving headroom unused.

## Fix — Single file: `PronunciationVisualizer.tsx`

**1. Aggressive peak decay** (line 434): `0.98/0.02` → `0.95/0.05`  
Peak halves in ~14 frames instead of ~35, tracking current speech volume.

**2. Higher amplitude floor** (line 441): `0.08` → `0.12`  
Quiet speech stays visible throughout.

**3. Faster phase advance** (line 468): `0.10 + normAmp * 0.19` → `0.12 + normAmp * 0.24`  
25% more oscillation cycles, matching the target contour's rhythm.

**4. Wider displacement** (line 476): `drawableRange * 0.60` → `drawableRange * 0.75`  
25% increase in vertical swing range.

**5. Lighter smoothing** (line 480): `0.66/0.34` → `0.55/0.45`  
Smoother deep oscillations without flattening — mirrors the target contour's bezier interpolation feel.

All five changes are constant tweaks in the `LiveInputCanvas` animation loop. No structural changes.

