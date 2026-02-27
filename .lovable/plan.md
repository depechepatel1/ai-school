
Implementation plan (using your uploaded original user visualizer as source of truth):

1) Extract and lock the original user-line logic from `user-uploads://Speaking_Studio-3.txt`:
- `LiveInputVisualizer` draw pipeline at lines ~519–557 (history push, x-from-time, y smoothing, quadratic render).
- Keep this as the canonical rendering algorithm for both lines.

2) Rewrite `src/components/speaking/PitchCanvas.tsx` so both cyan (computer) and green (user) lines use one shared history renderer:
- Create shared point history type: `{ x, y, mismatch? }`.
- Create one shared draw routine equivalent to the uploaded user visualizer loop (midline + quadratic segments + glow stroke).
- Remove the separate target-only point builder path (`buildContourPoints`/`buildTargetPoints`) so there is no divergent math.

3) Clone the user-line point-generation path for the computer line:
- Add `targetHistoryRef` and generate target points with the same x progression formula used by the user line (`elapsed/maxDur * width`).
- Feed target y from model contour (or prosody fallback), then apply the same smoothing/clamp steps as the user path before rendering.
- Keep only styling differences (cyan palette vs green palette).

4) Keep user-line generation exactly in the original style:
- Preserve analyser-based level sampling + smoothing + history accumulation behavior from the uploaded code.
- Keep silence auto-stop logic intact.
- Keep live history persistent after recording stops for side-by-side comparison.

5) Preserve existing scoring/backend behavior while cloning visuals:
- Continue collecting normalized pitch contour via `RealtimePitchTracker` for `onPitchContour` callback (analysis/progress logic).
- Decouple scoring contour capture from on-canvas drawing math so visual clone does not break scoring.

6) Cleanup conflicting/legacy logic:
- Remove playhead-specific cyan rendering path and any unused helpers that create different behavior between lines.
- Ensure both histories reset only at appropriate lifecycle points (new sentence/new recording), not immediately on stop.

7) Validate end-to-end in `/speaking`:
- Play model: cyan line must render with the cloned user-line algorithm.
- Record voice: green line must render with the same algorithm.
- Stop recording: green line stays visible; both lines remain comparable on screen.
- Confirm `onPitchContour` still fires and no regression in shadowing score updates.

Technical details (exact files/anchors):
- Source reference to clone from: `user-uploads://Speaking_Studio-3.txt` lines ~490–581 (especially ~519–557).
- Target file to change: `src/components/speaking/PitchCanvas.tsx`.
- Integration points to preserve: `src/pages/SpeakingStudio.tsx` props `onPitchContour`, `onAutoStop`, `modelContour`, `prosodyData`.
