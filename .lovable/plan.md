

## Plan: Fix 6 visualizer and karaoke issues

### Issue 1: Karaoke highlight one word behind

**Root cause**: The fallback timer in `tts-provider.ts` calls `onBoundary(charIndex)` using character positions from `cleanText` (which may differ from the original text after stripping annotations). But `prosodyData` word positions (`startChar`/`endChar`) are computed from the **original** text. Additionally, the timer fires the first word boundary at `charIndex=0` which `matchCharIndex` maps correctly, but the `estimateWordTimings` function doesn't account for the 400ms detection delay — by the time the fallback starts, speech is already ~400ms in, so word 0's boundary fires late and each subsequent word is ~1 word behind.

**Fix in `src/lib/tts-provider.ts`**:
- In the fallback timeout callback, offset the `startTime` back by the detection delay (400ms) so elapsed time calculations align with actual speech start.
- Fire word 0 boundary immediately on `onstart` (before the fallback timeout), not after the 400ms wait. Move the initial `onBoundary(0)` call into `utterance.onstart`.

### Issue 2: Long delay before TTS starts

**Root cause**: `browserSpeak` has a 60ms `setTimeout` before calling `speechSynthesis.speak()`, plus `speechSynthesis.cancel()` is called right before. The combination creates a perceptible delay.

**Fix in `src/lib/tts-provider.ts`**:
- Reduce the 60ms delay to 10ms (just enough to avoid Chrome's cancel→speak race).
- Only call `speechSynthesis.cancel()` if speech is actually pending/speaking.

### Issue 3: Student visualizer line too slow

**Root cause**: `DualWaveform` uses `lastModelDurationRef` (from the model playback) as the student line's traversal duration, falling back to 5000ms. This is inaccurate — the pre-measured TTS timings in the bucket are not being used.

**Fix**:
- Add a `modelDurationMs` prop to `DualWaveform` interface.
- In `PronunciationPractice`, use `usePronunciationTimings()` hook to get the duration for the current text and pass it as `modelDurationMs`.
- In `FluencyPractice`, use `useFluencyTimings(courseType)` hook similarly.
- In `DualWaveform`, use `modelDurationMs` prop (when available) instead of `lastModelDurationRef` for the student line's x-axis scaling.

### Issue 4: Auto-stop recording when line reaches end

**Fix**:
- Add an `onRecordingComplete` callback prop to `DualWaveform`.
- In the render loop, when `isRecording` and the student line's x position reaches `w - PAD`, fire the callback.
- Add a 1-second delay before firing (using a ref to track when the threshold was first crossed).
- In both practice screens, wire `onRecordingComplete` to stop the recording.

### Issue 5: Chunk counter pill shrinks the visualizer

**Root cause**: The layout uses `flex items-center gap-2` with the counter pill as a flex sibling, stealing width from the visualizer.

**Fix in both `PronunciationPractice.tsx` and `FluencyPractice.tsx`**:
- Remove `max-w-3xl` constraint, use `max-w-5xl` or wider.
- Make the visualizer `flex-1` take full width and position the counter pill as `absolute` offset to the right, so it doesn't affect the visualizer's width.

### Issue 6: Karaoke text should align with visualizer box width

**Fix**:
- In `ProsodyVisualizer`, remove `max-w-4xl` and replace with the same max-width as the visualizer box.
- In both practice screens, wrap the `ProsodyVisualizer` and `DualWaveform` in the same width-constrained container so they share identical left/right bounds.

### Files changed

1. **`src/lib/tts-provider.ts`** — Fix boundary timing offset; reduce speak delay
2. **`src/components/speaking/DualWaveform.tsx`** — Add `modelDurationMs` and `onRecordingComplete` props; use them in render loop
3. **`src/components/practice/PronunciationPractice.tsx`** — Pass timing duration and auto-stop callback; fix layout widths; align karaoke to visualizer
4. **`src/components/practice/FluencyPractice.tsx`** — Same changes as pronunciation screen
5. **`src/components/speaking/ProsodyVisualizer.tsx`** — Remove `max-w-4xl`, accept width from parent

