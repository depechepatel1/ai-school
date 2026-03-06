

## Design Principle (Persistent)

The looping video shows the teacher's head and shoulders -- the teacher's face is the central focus of the app and must never be obscured by UI elements.

## Plan: Right-align auth cards, shift video left

### Changes -- `src/components/PageShell.tsx`

**1. Move the floating card to the right side**
- Change the non-fullWidth content container from `flex items-center justify-center` to `flex items-center justify-end`
- Add right padding (`pr-8`) so the card has breathing room from the edge
- Keep `max-w-md` on the glass card

**2. Shift the video's center point left**
- When `fullWidth` is false, set `objectPosition` to `"30% center"` instead of `"center center"` -- this shifts the teacher's face to be visually centered in the free space to the left of the floating card (roughly the left 60% of the screen)
- When `fullWidth` is true, keep `"center center"`

**3. Footer alignment**
- Shift the compliance footer to align with the left/free area so it doesn't overlap the card -- change to `right-[40%]` or similar when not fullWidth

### Result
- Auth screens: glass card pinned right (~40% width), teacher's face centered in the remaining left 60%
- Full-width screens: unchanged, video centered
- Teacher's face is never obscured by UI
