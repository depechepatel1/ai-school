

## Plan: Move accent flag toggle between XP bar and button column

**Current state**: The accent toggle floats above the action bar at `bottom-[calc(32px+24rem+1rem)]`. The XP bar is in the top-right header area. The action button column is at `bottom-32 right-5`.

**Change**: Reposition the accent toggle to sit on the right side, vertically between the XP bar (top) and the button column (bottom). This means moving it from its current bottom-anchored position to a top-anchored position roughly in the middle-right area.

### Changes in `src/pages/SpeakingStudio.tsx`:

1. **Move the accent toggle div** (lines 403-411) from its current `bottom-[calc(32px+24rem+1rem)]` position to approximately `top-1/2 -translate-y-1/2 right-5` or a similar mid-right position (e.g., `top-[45%] right-5`) so it visually sits between the XP widget at the top-right and the button column at the bottom-right.

2. **Keep the same styling** — glassmorphism container, flag buttons, all unchanged. Only the positioning classes change.

