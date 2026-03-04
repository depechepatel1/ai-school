

## Problem

1. **Intro video never plays**: `useIntro` is `playIntroVideo && !customVideoUrl && !loopVideos`. Since `StudentPractice` passes both `playIntroVideo` and `loopVideos`, the intro is always suppressed.
2. **No session memory**: Even if fixed, the intro would replay every time the student navigates back to the dashboard within the same login session.

## Plan

### 1. Add session-level intro tracking via `sessionStorage`

Use a `sessionStorage` key (e.g. `intro_video_played`) that persists for the browser tab/session but resets on new login. This avoids database overhead for a purely cosmetic preference.

- On login (in `auth.tsx` `signIn`), clear the key so a fresh login always triggers the intro.
- In `PageShell`, check `sessionStorage` to determine whether the intro has already been shown this session.

### 2. Fix `useIntro` logic in `PageShell.tsx`

Change the condition from:
```ts
const useIntro = playIntroVideo && !customVideoUrl && !loopVideos;
```
to:
```ts
const alreadyPlayedIntro = sessionStorage.getItem("intro_video_played") === "true";
const useIntro = playIntroVideo && !alreadyPlayedIntro;
```

This allows `playIntroVideo` to work alongside `loopVideos`. When the intro finishes, write `sessionStorage.setItem("intro_video_played", "true")` in `handleIntroEnd`.

### 3. Clear flag on login

In `auth.tsx`, inside `signIn()`, after successful authentication add:
```ts
sessionStorage.removeItem("intro_video_played");
```

This ensures each new login session triggers the intro once.

### 4. Fix intro/loop video layering

Currently, when `useIntro` is true but `loopVideos` is also provided, the loop players still autoplay underneath. Update the autoPlay condition on Player A:
```ts
autoPlay={introFinished && activePlayer === "A"}
```

And keep the intro video visible until `handleIntroEnd` fires, then crossfade to the loop stack.

### Files to modify
- `src/components/PageShell.tsx` — fix `useIntro` logic, add sessionStorage read/write
- `src/lib/auth.tsx` — clear sessionStorage on `signIn`

