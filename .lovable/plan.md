

## The Problem

You're right to flag this. The current `PageShell` component hardcodes a fixed `1024x768` iPad-shaped frame centered on a dark background:

```
<div className="min-h-screen bg-neutral-900 flex items-center justify-center p-8">
  <div className="relative w-[1024px] h-[768px] rounded-[3rem] border-8 ...">
```

This means on any screen larger than 1024x768, there will be dead black space around the frame. On an actual iPad or tablet, it won't fill the screen either. It's a design mockup frame, not a production layout.

## Plan: Make PageShell fill the viewport

**File: `src/components/PageShell.tsx`**

1. **Remove the iPad frame entirely** -- Replace the fixed-size centered container with a full-viewport layout:
   - Outer wrapper: `min-h-screen w-full` (no padding, no centering)
   - Inner container: `w-full h-screen` (no fixed dimensions, no rounded corners, no border/ring)
   - Remove the decorative border, ring, and `rounded-[3rem]` that create the iPad bezel effect

2. **Preserve all child layout logic** -- The `fullWidth` vs sidebar split, the background stage, compliance footer, and dev login panel all stay functionally identical, just now filling the full viewport instead of a fixed box.

3. **Adjust border radii** -- Remove or reduce the inner `rounded-[2.5rem]` on the background stage since there's no bezel to inset from.

### Result

The app fills 100% of the browser window on desktop, and 100% of the screen on iPad/tablet. No wasted black canvas. The OmniMic button (portaled to `document.body`) will naturally sit over the actual content area since the content now IS the full viewport.

### What stays the same
- All page content, video backgrounds, left/right pillar layouts
- Dev login panel positioning (top-left corner, now of the viewport)
- GlobalOmniChat floating button (already portaled to body)
- Compliance footer

