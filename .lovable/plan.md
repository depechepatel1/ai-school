

## Plan: Dual A/B Video Player + Auth Video Alignment

### Two changes in `src/components/PageShell.tsx`:

---

### 1. Dual A/B Preload Player (eliminate black frames)

Replace the single `<video>` loop element with two stacked `<video>` elements (A and B).

**State additions:**
- `activePlayer: 'A' | 'B'` state (default `'A'`)
- `refA = useRef<HTMLVideoElement>(null)`, `refB = useRef<HTMLVideoElement>(null)` (replace `loopRef`)

**Lifecycle:**
1. On mount/`introFinished`: Player A loads `videoList[0]` and plays. Player B loads `videoList[1]` silently (paused, `preload="auto"`).
2. When A fires `onEnded`: set `activePlayer = 'B'`, call `safePlay(refB)`. Set A's `src` to `videoList[(index+2) % len]`, call `load()` to preload.
3. When B fires `onEnded`: mirror — swap to A, preload next on B.
4. `activeVideoRef` updated to point to whichever is active (for audio toggle).

**CSS (instant swap, no transition):**
- Active: `opacity-100 z-[1]`
- Inactive: `opacity-0 z-[0]`

**Single-video lists** (`shouldLoop`): Only render Player A with `loop={true}`, skip B entirely.

**JSX — both elements get:** `muted playsInline controls={false} preload="auto"` hardcoded, plus `safePlay` in `onCanPlay`.

---

### 2. Auth Screen Video Alignment

The right-side floating card occupies the rightmost 40% (`w-[40%]`). The visible background area is the left 60%. The video subject should be centered in that left 60%, meaning `objectPosition` should be `30% center` (half of 60%).

Current code already uses `30% center` for non-fullWidth pages (line 69). This is correct. No change needed here — the current value already centers the subject between the left edge and the card's left edge.

**However**, checking the memory note says auth pages use `96% center` — if that was reverted in the last diff, we need to confirm the current value is `30% center` for auth pages. Looking at line 69: `const objectPosition = fullWidth ? "center center" : "30% center"` — this is already correct. Auth pages are non-fullWidth, so they get `30% center`.

---

### Files changed
- `src/components/PageShell.tsx` — replace single loop video with dual A/B player system (~40 lines of handler + JSX changes)

