

## Fix Video Offset — Plan

The existing plan in `.lovable/plan.md` describes two problems and their fixes. Here's the refined implementation:

### Problem
1. **Video not moving**: `object-position` has no visible effect when the video aspect ratio closely matches the viewport — there's nothing to crop/shift.
2. **Vertical dark line**: The compliance footer gradient creates a hard edge at ~40% from the right, visible as a line on the teacher's shoulder.

### Changes

**File 1: `src/components/PageShell.tsx`**
- On auth screens (`!fullWidth`), apply `transform: translateX(-15%)` and `width: 130%` to the background stage wrapper div (currently `width: 120%`, `left: -10%`). This physically shifts the entire video left regardless of aspect ratio, replacing the unreliable `object-position` approach.
- Always pass `"center center"` as `objectPosition` to `BackgroundStage` — the CSS transform handles all horizontal shifting now.
- Remove the `videoPreset` / `resolvedPosition` logic since it's no longer needed for positioning.
- On auth screens (`!fullWidth`), remove the bottom gradient footer entirely to eliminate the vertical line artifact. Keep the `fullWidth` footer unchanged.

**File 2: `src/lib/videoFraming.ts`**
- Can be simplified or left as-is since the transform approach replaces `object-position` for auth screens. The `center` preset remains useful for fullWidth screens.

This is a 2-file change that eliminates both visual artifacts by using CSS transforms instead of `object-position` for horizontal video shifting.

