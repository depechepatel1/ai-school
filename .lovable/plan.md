

## Plan: Remove the right-side glass column on non-fullWidth pages

### Problem
When `fullWidth` is false (Login, Signup, WeekSelection, etc.), PageShell renders a 40%-width glass panel on the right side. This panel, along with the `bg-gradient-to-r from-black/30 via-transparent to-black/50` overlay, creates a visual anomaly over the teacher's shoulder in the looping background video.

### Changes — `src/components/PageShell.tsx`

1. **Remove the gradient overlay** (line 74) — the `bg-gradient-to-r from-black/30 via-transparent to-black/50` darkening strip that covers the right side of the video.

2. **Replace the glass column with a centered floating layout** — Instead of pinning children to a right-side 40% panel with the opaque backdrop-blur glass card, render children in a centered container (similar to a standard auth page layout) that floats over the full video without a large semi-transparent column blocking the teacher figure.

   The new layout for non-fullWidth pages:
   - Children rendered in a centered column (`flex items-center justify-center`) with a max-width constraint (`max-w-md`)
   - A subtle glass card (`bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10`) wrapping children — much lighter than the current heavy column
   - No gradient overlay darkening the video

3. **Update `objectPosition`** — Since there's no longer a right-side panel to offset the video subject against, change the non-fullWidth position from `"101% center"` to `"center center"` so the teacher is centered in frame.

### Result
The full background video is visible edge-to-edge. The login/signup form floats as a centered glass card over the video. No column, no gradient strip, no shoulder anomaly.

