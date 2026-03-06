

## Plan: Draggable Siri-style OmniMic Button

### What changes

**File: `src/components/GlobalOmniChat.tsx`**

1. **Draggable behavior** — Track pointer events (onPointerDown/Move/Up) to let the user drag the button anywhere on screen. Use a `position` state `{x, y}` with `translate` styling. Distinguish drag vs click by checking total movement distance (< 5px = click, otherwise drag). Persist position in component state only (resets on reload, which is fine).

2. **Siri-style pulsing orb animation** — Replace the current solid blue circle + ping animation with:
   - A radial gradient orb using soft purple/blue/pink tones (like Apple's Siri blob)
   - Multiple layered `div`s with different scale/opacity keyframe animations at staggered speeds to create the organic, breathing glow effect
   - CSS keyframes added inline or via Tailwind arbitrary values: slow scale pulse (2.5s), a counter-rotating outer glow (3s), and a soft color-shift gradient animation
   - The Mic icon remains centered with a subtle glow

3. **OmniChatModal anchor** — The modal renders relative to the button's current dragged position (anchored above-left of the button).

### CSS keyframes to add in `src/index.css`

```css
@keyframes siri-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.35); opacity: 0; }
}
@keyframes siri-breathe {
  0%, 100% { transform: scale(0.95); }
  50% { transform: scale(1.05); }
}
@keyframes siri-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Visual result
A soft, glowing orb with layered purple-blue-pink gradients that pulses and breathes like the iOS Siri widget. Draggable anywhere on screen. Tapping opens the AI chat modal.

