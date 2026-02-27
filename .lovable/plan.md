

## Problem

Two issues:
1. **Flashing artifact**: Two separate canvases (`TargetContourCanvas` and `LiveInputCanvas`) are stacked on top of each other, each calling `ctx.clearRect()` independently every frame. Since they're transparent overlays, the live canvas clears what the target canvas just drew, causing visible flicker.
2. **Rendering mismatch**: The two canvases use different drawing approaches — LiveInputCanvas draws incrementally in real-time with smoothing, while TargetContourCanvas draws all points at once with playhead animation. Even though the Y-mapping formula is the same, the visual result looks different.

## Solution

Replace both `TargetContourCanvas` and `LiveInputCanvas` with a single unified `PitchCanvas` component that draws both lines on one canvas in one render loop. This eliminates the competing `clearRect` calls (fixing the flash) and guarantees identical coordinate mapping for both contours.

## Changes

### 1. Create `src/components/speaking/PitchCanvas.tsx`
Single canvas component that handles everything:
- **Props**: `isRecording`, `isPlayingModel`, `activeWordIndex`, `prosodyData`, `modelContour`, `useSyntheticFallback`, `onAutoStop`, `onPitchContour`
- **Single render loop**: One `requestAnimationFrame` loop that draws both target (cyan) and live (green) lines on the same canvas, same coordinate space
- **Target line**: Drawn from `modelContour` (real mic-captured data) or synthetic prosody fallback, with playhead animation during TTS playback
- **Live line**: Drawn from real-time mic pitch detection during recording, using identical `y = h - pitch * h * 0.8 - h * 0.1` mapping
- **Mic management**: Handles mic init/cleanup for live recording internally (same as current LiveInputCanvas)
- **Auto-stop**: Silence detection for auto-stop callback
- **Pitch contour output**: Emits final contour on recording stop

### 2. Update `src/pages/SpeakingStudio.tsx`
- Remove imports of `TargetContourCanvas` and `LiveInputCanvas`
- Import new `PitchCanvas`
- Replace the two stacked `<div className="absolute inset-0">` wrappers with a single `<PitchCanvas>` element
- Pass all relevant props to the unified component

### 3. Delete old files
- `src/components/speaking/TargetContourCanvas.tsx` — no longer needed
- `src/components/speaking/LiveInputCanvas.tsx` — no longer needed

