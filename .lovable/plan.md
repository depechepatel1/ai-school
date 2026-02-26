

## Fix Video Playback Logic

The current code has the video roles inverted. Here's what needs to change:

### `src/components/PageShell.tsx`

1. **Swap the video constants' roles** (or rename for clarity):
   - `VIDEO_1` (Script video) = the **app-wide looping** background
   - `VIDEO_2` (Welcome video) = the **one-time intro** played only on the student dashboard

2. **Update the playback logic**:
   - When `playIntroVideo` is true (student dashboard): play VIDEO_2 once as intro, then transition to VIDEO_1 looping
   - When `playIntroVideo` is false (all other pages): immediately loop VIDEO_1
   - Currently the code does the opposite — the intro video plays first then loops VIDEO_2. We swap which video is the intro and which is the loop.

3. **Concrete change**: In the video rendering section, the intro `<video>` should use `VIDEO_2` (new welcome video) and the looping `<video>` should use `VIDEO_1` (original script video). The `loopVideo` variable should default to `VIDEO_1` instead of `VIDEO_2`.

This is a single-file edit to `src/components/PageShell.tsx` — no new components or migrations needed.

