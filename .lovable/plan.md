

## Problem
The target contour (cyan) uses synthetic prosody-derived points while the live contour (green) uses real pitch detection from the mic. These produce visually incomparable lines. The fix: when speakers are active (no headphones), capture the TTS audio through the mic using the same pitch detection, producing a real target contour. Fall back to synthetic prosody when headphones are detected.

## Changes

### 1. New hook: `src/hooks/useHeadphoneDetect.ts`
- Uses `navigator.mediaDevices.enumerateDevices()` to check for headphone/audiooutput devices
- Listens to `devicechange` events to update in real-time
- Returns `hasHeadphones: boolean`
- Detection heuristic: if >1 audio output device exists, headphones are likely connected

### 2. New state in `SpeakingStudio.tsx`
- Add `modelContour: number[]` state — stores mic-captured pitch contour from TTS playback
- Add `useHeadphoneDetect()` hook
- When `handlePlayModel` fires **and no headphones detected**:
  - Open mic via `getUserMedia({ audio: true })`
  - Create `RealtimePitchTracker` on that stream
  - Start tracking when TTS `onStart` fires
  - Stop tracking when TTS `onEnd` fires, store result in `modelContour`
- When headphones detected: skip mic capture, `modelContour` stays empty

### 3. Modify `TargetContourCanvas` props and rendering
- Add optional prop `contour?: number[]`
- When `contour` has data: render it as a real pitch line (same style as LiveInputCanvas — map normalized 0-1 values to y positions), ignoring the synthetic prosody points
- When `contour` is empty/undefined: use current synthetic prosody rendering (fallback for headphones mode)
- The contour line still animates with playhead progress during TTS playback

### 4. Clear `modelContour` on sentence change
- Reset `modelContour` to `[]` in `handleNextSentence` and `handleGenerate`

### Flow summary
```text
TTS plays + no headphones → mic captures speaker audio → RealtimePitchTracker → modelContour[]
                          → TargetContourCanvas renders real pitch line (cyan)
                          → Student records → LiveInputCanvas renders real pitch line (green)
                          → Both use identical pitch detection = visually comparable

TTS plays + headphones → mic can't hear speaker → modelContour stays empty
                       → TargetContourCanvas falls back to synthetic prosody points
```

