

## Problem

The right-side action bar in the shadowing view has two issues:
1. **Not vertically centered** — it's anchored with `bottom-32`, placing it low-right rather than centered on the right edge.
2. **Inconsistent gaps** — there's a decorative separator (`div w-6 h-px`) between Record and the Next button, plus between other buttons. With Ghost Mode removed, the 4-button stack is small enough that these separators add unnecessary visual weight and uneven spacing.

## Plan

**File:** `src/pages/SpeakingStudio.tsx` (lines 381-410)

1. **Center vertically** — Replace `bottom-32` with `top-1/2 -translate-y-1/2` to properly center the action bar on the right side of the screen.

2. **Remove all separator divs** — Delete the three `<div className="w-6 h-px bg-white/[0.06]" />` elements (lines 386, 390, 404). The `gap-1.5` on the flex container already provides consistent spacing between buttons.

3. **Uniform gap** — Keep `gap-1.5` for tight, balanced spacing across all 4 buttons (Hear Model, Record, Replay, Next).

Result: A clean, vertically-centered 4-button stack with consistent spacing and no leftover artifacts from removed features.

