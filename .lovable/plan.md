

## Problem

The teacher video uses a CSS `transform: scale(1.4)` hack to shift the teacher left, but this causes edge gaps and over-cropping. The native 16:9 video already has enough horizontal content — `object-cover` with the right `object-position` is sufficient.

## Plan

### 1. Remove the scale transform from `auth-video-scale`

In `src/index.css`, replace the current `.auth-video-scale` class with just an `object-position` override (no transform, no scale):

```css
@media (min-width: 1280px) {
  .auth-video-scale {
    object-position: 20% top;
  }
}
```

This shifts the teacher leftward using the video's native aspect ratio and `object-cover`, with no scaling. The `top` vertical alignment keeps the head visible.

### 2. No other file changes needed

`PageShell.tsx`, `IELTSMockTest.tsx`, and `VideoLoopStage.tsx` already pass the `scaleClass` through correctly — only the CSS definition changes.

