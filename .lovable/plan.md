

## Problem

The background container is shifted left by `translateX(-12%)` but remains `100%` wide (via `inset-0`). This means 12% of the right side reveals the black `bg-gray-900` background behind it.

## Solution

Make the container wider to compensate for the shift. If we translate left by 12%, we need the container to be at least 112% wide so it still covers the full viewport.

### Change in `src/components/PageShell.tsx` (line 65)

Replace:
```ts
style={!fullWidth ? { transform: 'translateX(-12%)' } : undefined}
```

With:
```ts
style={!fullWidth ? { transform: 'translateX(-12%)', width: '112%' } : undefined}
```

This stretches the video container to 112% of viewport width, so after the 12% leftward shift the right edge still reaches the screen edge. The video's center point stays in the same position.

