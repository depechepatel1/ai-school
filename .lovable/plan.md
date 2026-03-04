

## Plan: Rewrite Video Player from Scratch for Edge Compatibility

### Problem
The dual-player A/B swap system is fundamentally unreliable in Edge. The complexity of coordinating two video elements with reactive src swaps, opacity toggles, and play() calls creates race conditions that Edge's stricter media lifecycle rejects silently.

### New Approach: Single-Element Sequential Player
Replace the dual-player system with a **single `<video>` element** that plays clips sequentially. When one clip ends, swap `src` to the next clip and call `play()` from `onCanPlay`. This eliminates all cross-player coordination issues.

### Current PageShell usage by page type:
- **Auth pages** (Login, Signup, ForgotPassword, ResetPassword): `<PageShell>` — right-side card, no video props
- **ParentDashboard**: `<PageShell hideFooter>` — right-side card
- **StudentPractice**: `<PageShell playIntroVideo fullWidth loopVideos={VIDEO_1_STACK} hideFooter>`
- **SpeakingStudio, StudentProfile**: `<PageShell fullWidth loopVideos={VIDEO_1_STACK} hideFooter>`
- **StudentAnalysis**: `<PageShell fullWidth loopVideos={[ANALYSIS_VIDEO]} hideFooter>`
- **Teacher, Admin**: `<PageShell fullWidth bgImage={DASHBOARD_BG} hideFooter>` — keep as-is

### Changes

**File: `src/components/PageShell.tsx`** — rewrite video section only

1. **Remove**: Both `loopRefA`/`loopRefB`, `activePlayer`, `videoIndexA`/`videoIndexB` states, and the entire dual-player JSX block (Player A + Player B).

2. **Add**: Single `loopRef` + `videoIndex` state. One `<video>` element with:
   - `onEnded`: increment `videoIndex` (mod list length), set new `src` on the ref directly via DOM (not React state for src — avoids re-render race), then let `onCanPlay` trigger play.
   - `onCanPlay`: `ref.current.muted = true; ref.current.play().catch(() => {})` — Edge-safe.
   - `loop={shouldLoop}` for single-video lists (e.g., analysis page).

3. **Video positioning**:
   - **Auth pages** (`!fullWidth`): Change from `96% center` to `30% center` — offsets the video subject LEFT to centre between left edge and the right-side floating card.
   - **`fullWidth` pages**: Keep `center center`.

4. **Intro video** (`playIntroVideo`): Keep the separate intro `<video>` element. On `onEnded`, set `introFinished = true`, then the loop video's `onCanPlay` picks up automatically.

5. **Muted enforcement**: Single `useEffect` on mount that sets `ref.current.muted = true` on all video refs. The `onCanPlay` handler also forces `muted = true` before every `play()`.

6. **Remove** the `customVideoUrl` prop (unused by any page). Keep `loopVideos` and `bgImage`.

### Video positioning summary
```text
Page Type         objectPosition    Why
─────────────────────────────────────────────────
Auth (card right) "30% center"      Centres subject between left edge & card
Student fullWidth "center center"   Subject centred in full frame
Teacher/Admin     N/A (bgImage)     Static image, no video
```

