

## Analysis: Scale Would Enlarge the Teacher on All Screens

Applying `transform: scale(1.25)` unconditionally would make the teacher 25% larger on iPads and regular laptops where the head size is already ideal. The scaling is only needed on wide/large screens where the 16:9 video has near-zero overflow.

## Revised Approach: Responsive Scale via Media Query

Only apply the scale transform on viewports wider than ~1600px (where the aspect ratio approaches 16:9 and `object-position` loses effectiveness). On regular screens and iPads, keep scale at 1.

### Changes

**`src/components/stage/VideoLoopStage.tsx`**
- Add a `scale` prop (default `1`)
- Apply it via a CSS class that only activates at `@media (min-width: 1600px)` using an inline style + media query approach, or more simply: use a `useMediaQuery` check
- Actually, simplest: add a dynamic className. On each `<video>`, add a conditional class like `auth-video-scale` when `scale > 1`, and define that class in `index.css` with a media query:

**`src/index.css`** — add:
```css
@media (min-width: 1600px) {
  .auth-video-scale {
    transform: scale(1.25);
    transform-origin: 20% 45%;
  }
}
```

**`src/components/stage/VideoLoopStage.tsx`**
- Accept `scaleClass?: string` prop
- Apply it to all three `<video>` elements' className

**`src/components/stage/BackgroundStage.tsx`**
- Pass through `scaleClass` prop

**`src/components/PageShell.tsx`**
- Pass `scaleClass={fullWidth ? undefined : "auth-video-scale"}` to BackgroundStage

### Result
- iPads and regular laptops (< 1600px): **no scaling**, teacher head stays the same size
- Large/ultrawide monitors (≥ 1600px): 25% scale creates overflow, `object-position` can then shift the teacher left effectively
- The 1600px breakpoint and scale factor can be fine-tuned after testing

