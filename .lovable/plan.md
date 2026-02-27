

## Fix: Smooth Target Line Propagation

**File: `src/components/speaking/PronunciationVisualizer.tsx`**  
**Location: `TargetContourCanvas` render callback (lines 149–217)** — this is NOT inside the protected zone.

### Root Cause

The target (cyan) line propagates word-by-word because:
1. `targetProgress` jumps discretely at each TTS `onBoundary` event
2. Even though `animProgressRef` eases toward the target (`diff * 0.15`), the visible extent is computed as `Math.ceil(animProgressRef.current * points.length)`, which snaps to whole syllable/dip points
3. Result: the line tip jumps forward by one full segment at a time instead of gliding

### Fix

Replace the integer-quantized slicing with fractional interpolation of the final point:

```typescript
// Current (jerky):
const visibleCount = Math.max(1, Math.ceil(animProgressRef.current * points.length));
const visiblePoints = points.slice(0, visibleCount);

// Fixed (smooth):
const fractionalIndex = animProgressRef.current * (points.length - 1);
const floorIdx = Math.floor(fractionalIndex);
const frac = fractionalIndex - floorIdx;
const visiblePoints = points.slice(0, floorIdx + 1);

// Interpolate a fractional tip point between the current and next segment
if (frac > 0 && floorIdx + 1 < points.length) {
  const from = points[floorIdx];
  const to = points[floorIdx + 1];
  visiblePoints.push({
    x: from.x + (to.x - from.x) * frac,
    y: from.y + (to.y - from.y) * frac,
  });
}
```

This makes the line tip glide smoothly along the bezier path between syllable anchor points, eliminating the segment-by-segment jumping. The easing (`diff * 0.15`) already provides smooth acceleration — it just wasn't visible because the draw was quantized.

### What stays unchanged
- The protected zone (live user green line) is not touched
- The point computation (`computePoints`) stays identical
- The bezier drawing, gradients, glow, fill, and progress dot all remain the same
- The `targetProgress` source (TTS boundary events) stays the same

