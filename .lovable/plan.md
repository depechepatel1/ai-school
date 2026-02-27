
Implementation steps:
1) Update `src/pages/SpeakingStudio.tsx` to split shadowing controls into explicit callbacks:
- `startShadowRecording()`
- `stopShadowRecording()`
- `toggleShadowRecording()`
- Keep record button using `toggleShadowRecording`.
- Pass `onAutoStop={stopShadowRecording}` to `PitchCanvas` (not `handleRecord`) so auto-stop can only stop, never toggle/start.

2) Update `src/components/speaking/PitchCanvas.tsx` silence detection loop so it runs for the full recording lifecycle:
- Remove RAF stop condition tied to `x < w` in live draw loop.
- Keep RAF running while `isRecording` is true.
- Clamp visual `x` to canvas width for rendering (`drawX = Math.min(x, w)`), but continue silence checks every frame.

3) Harden auto-stop state handling in `PitchCanvas`:
- Add `autoStopTriggeredRef` and reset it at recording start.
- Gate auto-stop to fire once per recording session.
- Keep `hasSpokenRef` gate.
- Track silence only after speech detected; trigger `onAutoStop` after 1000ms silence.

4) Keep visualization behavior unchanged except for loop longevity:
- Preserve existing contour capture (`RealtimePitchTracker`) and `onPitchContour`.
- Preserve current smoothing/scaling values already agreed.
- Do not alter target/live draw styles in this step.

5) Verify end-to-end on `/speaking`:
- Start recording, speak, then stop speaking for >1s.
- Confirm record button turns off automatically.
- Confirm auto-stop still works if speaking lasts longer than canvas duration.
- Confirm no regressions in replay/save/score flow.

Technical details:
- Files:
  - `src/pages/SpeakingStudio.tsx`
  - `src/components/speaking/PitchCanvas.tsx`
- Key logic changes:
  - Replace toggle-style auto-stop callback with dedicated stop callback.
  - Live RAF condition: `if (isRecording) requestAnimationFrame(draw)` (not gated by timeline width).
  - One-shot auto-stop guard to prevent repeated stop calls before React state settles.
