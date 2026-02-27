
Goal
- Make the target (cyan) contour advance in sync with actual spoken words, then remain visible after playback.
- Rebuild the live user line pipeline so it no longer appears flat and reliably traverses near top/bottom bounds.

Implementation steps

1) Rewire target progression to speech events (not timer)
- Update `src/pages/SpeakingStudio.tsx` to track a continuous model progress value (0→1) from TTS boundary events.
- Replace fuzzy boundary matching (`Math.abs(startChar - charIndex) < 4`) with exact word-range matching (`startChar <= charIndex < endChar`) for stable active word updates.
- Keep `activeWordIndex` for text highlighting, and pass a new `targetProgress` prop into `PronunciationVisualizer`.

2) Refactor target canvas to be boundary-driven + persistent
- Update `TargetContourCanvas` in `src/components/speaking/PronunciationVisualizer.tsx` to render contour visibility from `targetProgress` directly.
- Remove internal `Date.now()` duration-based propagation loop.
- Persist final rendered contour after TTS ends (freeze at full progress) and only reset when sentence/prosody data changes.

3) Recode the user line renderer from scratch
- Replace the current RMS-only path builder in `LiveInputCanvas` with a new pipeline:
  - adaptive input normalization (noise floor + dynamic gain),
  - dual signal features (energy + spectral movement),
  - bidirectional vertical mapping spanning near full container height.
- Ensure Y mapping uses full drawable range (small top/bottom padding only) and includes controlled oscillation so movement is visibly up/down, not only “up from center”.
- Rebuild history buffering and drawing loop for stable, continuous trajectory with robust cleanup on stop/unmount.

4) Persistence/comparison behavior
- Keep user line visible after recording stops.
- Keep full target contour visible after model playback completes.
- Clear traces only when a new sentence loads or a new recording session starts (depending on mode trigger).

5) Mode consistency
- Ensure both “Play Model” and ghost-mode model speech update the same target progression state, so propagation behavior is identical in both flows.

Technical details (implementation-level)
- Files to update:
  - `src/pages/SpeakingStudio.tsx`
  - `src/components/speaking/PronunciationVisualizer.tsx`
- New visualizer props:
  - `targetProgress: number`
  - (optional) `sentenceKey`/reset token to force deterministic canvas reset on sentence change.
- Progress mapping:
  - word progress from boundary char index -> syllable cumulative index -> contour reveal length.
- Live recode safeguards:
  - hard clamp Y to `[edgePadding, h - edgePadding]`
  - avoid stale RAF/audio contexts
  - stop mic tracks/context on all exit paths.

```text
TTS boundary events
   -> word index + targetProgress
   -> Target canvas reveal amount
   -> onEnd => freeze full contour

Mic stream
   -> normalized features
   -> full-range Y mapping
   -> persistent user trace
```

Acceptance checks
- Cyan line starts unrevealed, advances with spoken words, and stays on-screen after speech ends.
- User line shows strong vertical oscillation across most of canvas height during speech.
- After user stops, both target and user traces remain visible for visual comparison.
- On next sentence, visualizer resets cleanly and starts from beginning.
