

## Analysis

### Problem 1: Video not moving
The videos use `object-fit: cover` with `object-position: 30% center`. The `object-position` property only shifts the focal point when the video is being cropped by `object-cover`. If the video's native aspect ratio is close to the viewport's aspect ratio, there is very little or no cropping happening, so changing the percentage has almost no visible effect.

**Fix**: Instead of relying on `object-position`, apply a CSS `transform: translateX()` to the background stage container itself. This physically moves the entire video left, guaranteeing visible movement regardless of aspect ratio. The container will also need to be made wider than the viewport to avoid revealing empty space on the right.

### Problem 2: The vertical line with one-sided fade
The compliance footer (line 78) has `right-[40%]` which creates a `bg-gradient-to-t from-black/90 to-transparent` overlay covering only the left ~60% of the screen. The right edge of this overlay at the 40% mark creates a hard vertical line -- dark/faded to the left, no fade to the right. This is the line visible on the teacher's shoulder.

Additionally, the glass card's `backdrop-blur-xl` and `shadow-[0_30px_60px_-10px_rgba(0,0,0,0.7)]` create additional blur boundaries and dark halos.

**Fix**: On auth screens (non-fullWidth), remove the footer gradient entirely or make it transparent. The fade overlays should only appear on speaking/shadowing screens (which already use `fullWidth` + `hideFooter`).

---

## Changes -- `src/components/PageShell.tsx`

### 1. Shift video left using transform instead of object-position
- On the background stage wrapper (line 63), when `!fullWidth`, apply `style={{ transform: 'translateX(-15%)', width: '130%' }}` to physically shift the video left and widen it to fill the gap on the right
- Remove the `objectPosition` variable and pass `"center center"` to BackgroundStage always (the transform handles the shift now)

### 2. Remove fade effects on auth screens
- Remove the bottom gradient footer entirely when `!fullWidth` (auth screens) -- the footer currently uses `bg-gradient-to-t from-black/90` with `right-[40%]` which creates the hard vertical line
- Keep footer behavior for `fullWidth` screens unchanged
- Reduce the glass card shadow from `shadow-[0_30px_60px_-10px_rgba(0,0,0,0.7)]` to a subtler `shadow-2xl` to eliminate the dark halo bleeding onto the video

