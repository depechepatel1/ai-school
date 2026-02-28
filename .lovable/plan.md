

# UI/UX Audit & Redesign Plan: Shadowing Screen

## Current State Analysis

From the screenshots and code review, here is what exists in **shadowing mode**:

**Left column (stacked vertically, top-left):**
1. Timer/StreakWidget — functional, connected to `usePracticeTimer`
2. UK/US accent toggle — functional, switches TTS accent
3. Topic box (pronunciation) / Chunk counter (fluency) — functional
4. Week Selector — functional, changes curriculum week
5. Pronunciation/Fluency pill toggle — functional

**Top-right:**
6. XP Widget — functional, tracks session XP
7. Shadowing/Speaking mode toggle — functional

**Right sidebar (vertically centered):**
8. Headphones button — functional (plays TTS model)
9. Mic button — functional (records student)
10. Play button — functional (replays recording)
11. Ghost button — functional (simultaneous TTS+record)
12. Skip button — functional (next sentence/chunk)

**Bottom bar:**
13. Question text (fluency only) — functional, shows parent question
14. ProsodyVisualizer (karaoke text) — functional
15. Progress bar (pronunciation only) — functional
16. PronunciationVisualizer (dual-canvas waveform) — functional

**Dead elements found: None.** All buttons are wired to real logic.

---

## Problems Identified

### Layout & Obstruction
- **P1**: The left column has 5 stacked widgets creating a tall, heavy block that encroaches toward the teacher's face area. On the 1024x768 frame, this column extends roughly 350px down from the top.
- **P2**: The right action bar is vertically centered, placing the mic button directly beside the teacher's face.
- **P3**: The bottom panel (karaoke + visualizer) is dense and tall (~180px), reducing the visible face area.

### Visual Quality
- **P4**: Left widgets are all `max-w-[200px]` — some feel cramped (Week Selector text is tiny), others feel oversized for their content.
- **P5**: Inconsistent border radii — `rounded-2xl`, `rounded-xl`, `rounded-3xl` mixed without hierarchy.
- **P6**: The accent toggle (UK/US) is only relevant context, not a frequent action, yet occupies prime real estate.
- **P7**: Chunk counter box has two lines ("Chunk 1/17" + "Week 2") but looks identical to the Topic box — no visual distinction between info types.
- **P8**: The question text (`Q: ...`) is truncated with `truncate` — long questions get cut off.

### Micro-interactions
- **P9**: No entry animations on left widgets — they appear instantly.
- **P10**: No hover feedback on info-only boxes (Topic, Chunk counter).
- **P11**: The Skip button has no visual confirmation that the sentence actually changed.

---

## Redesign Plan

### Step 1: Relocate left column — reduce to essentials, move secondary items

**Move accent toggle into the action sidebar** as a small toggle at the top (it's a setting, not a status). This removes one widget from the left stack.

**Merge chunk counter into the bottom bar** next to the question text — it's contextual to the content being displayed, not a global status. Remove it from the left column entirely.

**Remaining left column (top-left):**
- Timer (StreakWidget)
- Topic box (pronunciation mode only)
- Pronunciation/Fluency pill toggle

This reduces the left stack from 5 items to 2-3, keeping the teacher's face clear.

### Step 2: Move Week Selector to the bottom bar (fluency mode)

Place it inline with the chunk counter in the bottom content area. It's a content-navigation control, not a global setting. In pronunciation mode, it stays hidden (not used).

### Step 3: Reposition right action bar — push lower

Move the right action bar from `top-1/2 -translate-y-1/2` (dead center) to `bottom-32 right-5`. This shifts all buttons below the teacher's face zone (lower-right quadrant). The bar becomes a compact floating dock.

### Step 4: Upgrade bottom panel spacing

- Remove `truncate` from question text — use `line-clamp-2` instead so longer questions wrap to 2 lines max.
- Add a subtle fade-in animation (`animate-fade-in`) when chunk text changes.
- Reduce bottom padding from `pb-6` to `pb-4` and tighten the gradient.

### Step 5: Consistent glassmorphism refinement

Standardize all glass containers to one recipe:
- `bg-black/40 backdrop-blur-2xl border border-white/[0.06] rounded-2xl`
- Hover state (interactive items only): `hover:border-white/[0.12] hover:bg-black/50`
- Shadows: `shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]`

Remove the `max-w-[200px]` constraint — let items size naturally within the column.

### Step 6: Typography cleanup

- All label text: `text-[9px] font-bold uppercase tracking-[0.15em] text-white/35` (consistent)
- All value text: `text-[13px] font-semibold text-white/90`
- Question text: `text-[12px] italic text-white/50 leading-relaxed` (remove truncate, add line-clamp-2)
- Karaoke text: unchanged (protected zone)

### Step 7: Micro-interactions

- **Staggered entry**: Left column widgets get `animate-fade-in` with increasing `animation-delay` (0s, 0.1s, 0.2s).
- **Chunk transition**: When `sentenceKey` changes, the ProsodyVisualizer content fades out/in using a CSS transition on opacity with a key-driven remount.
- **Skip button**: Add a brief `scale-90` press feedback and a subtle cyan flash on the karaoke area.
- **Accent toggle**: Smooth background slide using `transition-all duration-200` (already present, just needs the relocation).

### Step 8: XP Widget position refinement

Keep top-right but add `mt-4 mr-3` for breathing room from the frame edge. The Shadowing/Speaking toggle stays below it.

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/pages/SpeakingStudio.tsx` | Relocate accent toggle to action sidebar; move chunk counter + week selector to bottom bar; reposition action bar lower-right; standardize glass styles; add staggered animations; fix question text truncation |
| `src/components/speaking/StreakWidget.tsx` | Minor: standardize border-radius to `rounded-2xl` consistently |
| `src/components/speaking/WeekSelector.tsx` | Minor: match glass style recipe |
| `src/components/speaking/ProsodyVisualizer.tsx` | Add fade transition wrapper keyed to content changes |

No new files created. No components removed (all are functional).

