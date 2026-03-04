

## Plan: Separate accent flags from the action button bar

**Problem**: The UK/US flag toggle (lines 405-411) is inside the right action bar, making it too wide for the icon buttons.

**Solution**: Move the accent toggle out of the action bar into its own small element positioned just above or to the left of the bar. Keep the action bar thin with only the icon buttons.

### Changes in `src/pages/SpeakingStudio.tsx`:

1. **Extract the accent toggle** (lines 405-411) from the action bar div
2. **Place it as a separate absolutely-positioned element** above the action bar (e.g., `absolute bottom-[calc(32px+full-bar-height)] right-5` or simply above the bar using a wrapper with flex-col)
3. **Remove the separator** div on line 413 that follows the accent toggle
4. **Result**: The action bar only contains the icon buttons (Headphones, Mic, Play, Ghost, Skip) and stays narrow at ~`w-[4.5rem]`-ish width, while the flag toggle floats independently above it

