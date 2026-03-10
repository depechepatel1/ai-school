

## Fix: Shift teacher video back to the left on auth screens

The current `object-position: 30% 45%` is anchoring the video too far right, causing the teacher to be hidden behind the floating glass card.

### Change in `src/components/PageShell.tsx` (line 70)

Lower the horizontal percentage to pull the focal point further left:

```tsx
objectPosition={fullWidth ? "center center" : "20% 45%"}
```

`20%` (down from `30%`) shifts the crop anchor further left, moving the teacher away from the right-side card. The vertical `45%` stays the same to preserve head visibility. Can be fine-tuned further (e.g. `15%` or `25%`) after visual testing.

