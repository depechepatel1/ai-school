

## Plan: Smart Line Justification for Karaoke Text

**Problem**: The karaoke text needs to span the full width of the visualizer so syllables align with audio peaks. But when text wraps, a short second line (< 4 words) gets stretched across the full width, looking bad.

**Solution**: Use a two-row layout approach in `ProsodyVisualizer.tsx`:

1. **Make text wider than the visualizer** — change `max-w-3xl` to `max-w-4xl` (the visualizer box below uses `max-w-3xl`), giving the text a slightly wider canvas.

2. **Split words into lines using a ref-based approach** — After render, detect which words are on which visual line using `offsetTop` of each word element. Then apply:
   - **First line**: `justify-between` (full justified, spanning the width)
   - **Subsequent lines with < 4 words**: `justify-center` (centered)
   - **Subsequent lines with ≥ 4 words**: `justify-between` (full justified)

**Implementation in `ProsodyVisualizer.tsx`**:
- Add `useRef` + `useEffect` + `useState` to measure word positions after render
- Group words into lines by comparing `offsetTop` values
- Render each detected line as its own flex row with appropriate justification
- Fallback: render all words in a single `justify-between` row if measurement hasn't happened yet

This keeps the first line fully justified (aligned with the visualizer) while centering short trailing lines.

