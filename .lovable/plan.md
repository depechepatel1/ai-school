

## Root Cause Analysis

### Bug 1: Glitchy random wavy line
The simulation fallback (lines 559-589) is triggering. When `getUserMedia` throws (permission denied, or any mic error), the `catch` block installs a fake render callback that:
- Generates a synthetic sine wave with `Math.sin(elapsed * 0.003)`
- Randomly assigns mismatch with `Math.random() > 0.85` — causing random red/green color flicker
- Has no real audio data, producing an artificial "glitchy" pattern

Additionally, even when mic succeeds, ring buffer x-coordinates are unbounded (`elapsed / maxDur * cw`). Once elapsed exceeds `maxDur`, x goes beyond canvas width, and the `lineTo` path draws off-screen then wraps back through the ring buffer creating visual discontinuities.

### Bug 2: Auto-stop silence detection never fires
The silence detection logic (lines 511-522) has a fatal flaw:
- `noiseFloor` initializes to `0.01` (line 289)
- Threshold for "speech detected" is `noiseFloor * 2.5 = 0.025`
- Noise floor only adapts upward when `rms < noiseFloor * 1.5 = 0.015` (line 484)
- In any environment with ambient noise > 0.015 RMS (very common), the noise floor **never adapts**, so even ambient noise registers as "speech", resetting `silenceStart` every frame
- Result: silence is never detected, auto-stop never fires

Also: `silenceStart` is initialized to `Date.now()` at line 337, but line 513 resets it to `Date.now()` whenever speech is "detected" (which is always, due to the threshold bug). The logic should require actual speech before starting the silence countdown.

## Fix Plan — `src/components/speaking/PronunciationVisualizer.tsx`

### Fix 1: Remove simulation fallback / replace with idle state
Delete the catch block's fake render callback (lines 559-589). Instead, show nothing on mic failure — just log the error. The simulation produces the "glitchy random wavy line" artifact.

### Fix 2: Clamp x-coordinates to canvas width
In the render callback (line 537), clamp: `const x = Math.min(cw, (elapsed / maxDur) * cw)`. This prevents off-screen drawing artifacts when recordings exceed `maxDur`.

### Fix 3: Fix noise floor adaptation — bidirectional tracking
Replace the one-directional noise floor adaptation (line 484-486) with a calibration phase:
- First ~500ms of recording: collect RMS samples to establish ambient noise baseline
- After calibration: set noise floor to the median of calibration samples
- Speech threshold = `noiseFloor * 3.0` (more headroom)
- This ensures silence detection works regardless of ambient noise level

### Fix 4: Require speech-before-silence gating
Add a `speechDetected: boolean` flag to `LiveState`. Auto-stop only activates after at least one frame of speech has been detected. This prevents premature auto-stop during the calibration period and ensures the timer only counts post-speech silence.

### Fix 5: Increase silence threshold multiplier
Change the speech detection threshold from `noiseFloor * 2.5` to `noiseFloor * 3.5` to better distinguish speech from ambient noise after proper calibration.

