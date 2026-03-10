

## Revised Plan: Minimize upscaling by using full video width

### Problem with current approach
The `translateX(-20%)` + `width: 120%` approach physically shifts the video container, wasting 20% of the video's native pixels off-screen to the left. This forces the browser to stretch the remaining visible portion, and on large screens the video runs out of pixels on the right — causing the black band.

### Better approach: `object-fit: cover` + `object-position`
Instead of moving the container, keep it at full viewport size (`inset-0`) and let `object-position` control which part of the video is the anchor point. The video element already has `object-fit: cover` applied in `VideoLoopStage.tsx`, which means:

- The browser uses **100% of the video's native pixels**
- It only scales up the minimum amount needed to fill the viewport (on a 16:9 monitor viewing a 16:9 video, scaling is essentially zero)
- `object-position: 30% 45%` shifts the crop anchor left and slightly up, so the teacher appears left-of-center and their head isn't clipped

### Changes in `src/components/PageShell.tsx`

**1. Remove the transform/width style** from the background container (line ~65):
```tsx
// Before:
style={!fullWidth ? { transform: 'translateX(-20%)', width: '120%' } : undefined}
// After:
// Remove the style prop entirely (or set to undefined)
```

**2. Update `objectPosition` prop** on BackgroundStage (line ~72):
```tsx
objectPosition={fullWidth ? "center center" : "30% 45%"}
```

- `30%` horizontal — teacher shifts left (uses all native pixels, just changes the crop anchor)
- `45%` vertical — slightly above center to preserve the teacher's head on taller viewports

No other files change. `VideoLoopStage.tsx` already applies `object-cover` and passes `objectPosition` through via the `style` prop on all `<video>` elements. The vertical value can be fine-tuned after visual testing.

