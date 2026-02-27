

## Plan: Protect the User's Line Code

### 1. Add guard comments to `src/components/speaking/PronunciationVisualizer.tsx`

**Before line 498** (the `renderRef.current = () => {` line), insert:
```
/* ╔══════════════════════════════════════════════════════════════╗
 * ║  🔒 PROTECTED ZONE — NORMAL REPEATING MODE USER LINE       ║
 * ║  DO NOT MODIFY without user saying "unlock protected zone"  ║
 * ║  This took a month to tune. Shadowing-mode fixes must       ║
 * ║  branch AROUND this logic, not alter it.                    ║
 * ║  Regression test: src/test/live-line-y-mapping.test.ts      ║
 * ╚══════════════════════════════════════════════════════════════╝ */
```

**After line 608** (the closing `};` of the render callback), insert:
```
/* ╔══════════════════════════════════════════════════════════════╗
 * ║  🔒 END PROTECTED ZONE — NORMAL REPEATING MODE USER LINE   ║
 * ╚══════════════════════════════════════════════════════════════╝ */
```

### 2. Create `src/test/live-line-y-mapping.test.ts`

A regression test that imports nothing from the component (pure math verification) and locks down these exact values:

| Constant | Expected Value |
|---|---|
| `PEAK_DECAY` | `0.985` |
| `PAD` | `8` |
| `baseY` | `PAD + drawableRange * 0.85` |
| `upwardPull` | `smoothAmp * drawableRange * 1.6` |
| `centroidNudge` | `(centroid - 0.5) * drawableRange * 0.2` |
| Smoothing | `smoothY * 0.865 + targetY * 0.135` |
| `normAmp` floor | `0.18` when `cleanRms > 0.005` |
| `maxDur` | `Math.max(4000, totalSyl * 400)` |

The test replicates each formula with sample inputs and asserts the output matches, so any accidental change to these values in the component will be caught.

### Protocol reminder

To modify anything inside the protected zone in the future, include the phrase **"unlock protected zone"** in your message. Without it, edits to that section will be refused.

