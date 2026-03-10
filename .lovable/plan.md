

## Why the teacher moved right instead of left

The `transform: scale(1.25)` with `transform-origin: 0% 45%` anchors the LEFT edge of the video and expands everything RIGHTWARD. The teacher (near the center of the video) gets pushed further right by 25% — the exact opposite of what we want.

## Fix

Change `transform-origin` to anchor the RIGHT edge so the expansion pushes content LEFT:

**`src/index.css`** (line 131-133):
```css
@media (min-width: 1280px) {
  .auth-video-scale {
    transform: scale(1.25);
    transform-origin: 100% 45%;
  }
}
```

**`src/components/PageShell.tsx`** (line 70):
```tsx
objectPosition={fullWidth ? "center center" : "30% 45%"}
```
Restore to `30%` — with the corrected transform-origin providing leftward expansion, this baseline value should place the teacher properly. Can fine-tune after.

