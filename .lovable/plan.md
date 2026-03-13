

## Problem

The two-pass measurement approach in `ProsodyVisualizer` is fragile. It renders words in a hidden `flex-wrap justify-between` container, measures `offsetTop` to group words into lines, then re-renders with per-line justification. This breaks because:

1. **Measurement pass uses `justify-between`** which changes word positions vs the final render, causing incorrect line grouping.
2. **On narrower screens**, large fonts (`text-2xl`/`text-4xl`) cause most words to land on their own line, making `justify-between` spread single words pointlessly.
3. **The `max-w-4xl` container** doesn't adapt — it's the same width regardless of viewport.

## Fix

Replace the two-pass measurement system with a single-pass `flex-wrap` layout that always works:

### `ProsodyVisualizer.tsx` — Simplify to single-pass layout

- Remove the `measureLines` callback, `lines` state, `wordRefs`, and the two-phase render.
- Use a single `flex flex-wrap items-end justify-center gap-x-2 gap-y-1` container.
- This naturally wraps words to fit the available width on any screen size.
- Words are centered per visual line with consistent spacing — no measurement needed.
- Keep all existing font sizes, colors, shadows, and pitch offsets exactly as they are.

The result: words flow naturally in a centered flex-wrap, adapting to any screen width without the fragile offsetTop measurement that causes the broken justification.

