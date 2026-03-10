

## Align Karaoke Text Width to Visualizer Box

The ProsodyVisualizer (karaoke text) currently uses `max-w-3xl mx-auto` with `flex-wrap justify-center` and `px-8` padding — it centers words in a cluster. The visualizer box below also uses `max-w-3xl` with `px-8` internal padding. The text needs to stretch edge-to-edge to match the visualizer's drawing area.

### Change

**`src/components/speaking/ProsodyVisualizer.tsx`** — Update the container from centered flex-wrap to full-width justified layout:

- Change `max-w-3xl` → `w-full max-w-3xl` (already has both, keep)
- Change `justify-center` → `justify-between` so words spread across the full width
- Keep `px-8` to match the visualizer box's `px-8` internal padding
- This ensures syllable peaks/valleys in text align horizontally with the canvas peaks/valleys

This single-file change applies to all 5 screens (IELTS/IGCSE Pronunciation, IELTS/IGCSE Fluency, SpeakingStudio) since they all use the same component.

