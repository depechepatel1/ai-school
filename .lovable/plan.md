

## Plan: Rebuild Video Player with Edge-Safe Guarantees

### Problem
The current single-element player sets `src` via DOM in a `useEffect` and relies on `onCanPlay` to call `play()`, but Edge is still refusing to play. The `<video>` tag lacks `muted` and `autoPlay` HTML attributes (removed in last diff), and the `play()` catch is empty so failures are silent. Additionally, swapping `src` on a single element causes a black flash.

### Solution — 3 requirements addressed

**File: `src/components/PageShell.tsx`**

#### 1. Prevent Black Flickering
- Add `poster` attribute: capture a transparent 1x1 pixel as a data URI, OR more practically, set `background: black` on the container (already done via `bg-gray-900`) and keep the video element's last frame visible by **not clearing `src`** — just overwrite it. The video element retains its last painted frame until the new source's first frame is decoded.
- Add CSS `background-color: transparent` on the video element so the container's dark background shows through rather than a jarring white/black flash.

#### 2. Hardcode Autoplay Attributes in JSX
- Add back `muted`, `autoPlay`, and `playsInline` directly on the `<video>` JSX tag. Remove `controls` explicitly with `controls={false}`. This satisfies Edge's autoplay policy check at HTML parse time, before React hydrates.
- The `useEffect` still forces `muted = true` via ref as a belt-and-suspenders approach.

#### 3. Robust Play Promise Handling with Retry
- Replace `.catch(() => {})` with a retry mechanism:
```tsx
const safePlay = (v: HTMLVideoElement) => {
  v.muted = true;
  v.play().catch(() => {
    setTimeout(() => {
      v.muted = true;
      v.play().catch(() => {});
    }, 150);
  });
};
```
- Use `safePlay()` in `onCanPlay`, in the initialization `useEffect`, and in the `toggleAudio` handler.

#### 4. Audio Toggle Fix
- Change initial `isMuted` to `false` conceptually — but since autoplay requires muted, keep `isMuted = true` initially. The mute button should work: ensure `toggleAudio` calls `safePlay()` after unmuting so Edge re-engages playback.
- Make the mute button always clickable (currently it is, the user said they "cannot activate" it — likely because the video isn't playing so there's nothing to unmute).

#### 5. Initialization Effect
- Set `v.src = videoList[0]` in the effect, force `v.muted = true`, call `v.load()`, then call `safePlay(v)` directly rather than waiting for `onCanPlay` alone. The `onCanPlay` handler also calls `safePlay()` as a fallback.

### Summary of line changes in `src/components/PageShell.tsx`:
1. **Add `safePlay` helper** (new function ~5 lines) after the refs block
2. **Update init effect** (lines 73-89): after `v.load()`, also call `safePlay(v)` 
3. **Update `handleLoopCanPlay`** (lines 118-125): use `safePlay(v)` instead of `v.play().catch(() => {})`
4. **Update `handleLoopEnded`** (lines 107-115): after `v.load()`, also call `safePlay(v)` as a backup
5. **Update `<video>` JSX** (lines 178-191): add `muted autoPlay controls={false}` attributes back, add `style={{ backgroundColor: 'transparent' }}`
6. **Update `toggleAudio`** (lines 91-99): after setting `vid.muted = false`, call `safePlay(vid)` to re-engage playback

