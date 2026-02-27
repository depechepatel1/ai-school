

## Problem

The target (cyan) and live (green) lines use fundamentally different rendering approaches:

1. **Target line**: Evenly spaces all contour points across the full canvas width, auto-scaled to the contour's own min/max range
2. **Live line**: Plots points based on real-time elapsed time (time-based x), applies heavy 0.8/0.2 smoothing between frames, and uses a different min/max range (model range expanded by 20%)

This means even identical pitch data would render as completely different shapes.

## Solution

After recording stops, rebuild the live line from the raw captured contour using the **exact same logic** as the target line — evenly spaced across canvas width, same auto-scaling. During recording, continue plotting in real-time for visual feedback, but on stop, replace the incremental history with the properly-built version.

## Changes

### `src/components/speaking/PitchCanvas.tsx` — rewrite live line rendering

1. **Store raw contour ref**: Keep `liveContour` ref (the raw `number[]` from the tracker) alongside `liveHistory`
2. **On recording stop**: Save the final contour from the tracker into `liveContour.current`
3. **New `buildLivePoints` function**: Clone of `buildTargetPoints` but reads from `liveContour.current` — identical even spacing, identical `mapYScaled` with its own min/max range
4. **During recording**: Keep current real-time plotting for immediate feedback
5. **After recording stops**: Draw from `buildLivePoints` instead of `liveHistory`, so both lines use identical point distribution and scaling
6. **Remove the 0.8/0.2 smoothing blend** from real-time plotting — it distorts the shape
7. **Unify min/max range**: Both lines use their own data's min/max with identical margin calculation (no extra 20% expansion for live)

