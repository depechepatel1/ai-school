

## Problem

Videos are fetched from cloud storage on every app launch. The user wants them always available without re-downloading.

## Good News: They're Already Cached

The PWA service worker config already has a `CacheFirst` strategy for `.mp4` files (line 34-37 of `vite.config.ts`). This means after the **first** download, videos are served from the browser cache for up to 7 days. However, there are two issues:

1. **The `?v=2` cache-bust parameter** — the URL pattern `\.(?:mp4)$` won't match URLs ending in `?v=2`, so the service worker may not be caching them at all.
2. **No proactive precaching** — videos only cache after they're first played, not on app install.

## Plan

### 1. Fix the service worker URL pattern to match cache-busted video URLs

Update the runtime caching `urlPattern` in `vite.config.ts` to match URLs with query parameters:

```
// Before: /\.(?:png|jpg|jpeg|webp|gif|mp4)$/
// After:  /\.(?:png|jpg|jpeg|webp|gif|mp4)(\?.*)?$/i
```

This ensures the `CacheFirst` handler actually intercepts and caches the video URLs.

### 2. Hardcode the video URL list as the primary source

In `useVideoLoopStack.ts`, make the hardcoded `FALLBACK_STACK` (1–13.mp4) the **default** list returned immediately, eliminating the storage API call on every launch. The storage listing query becomes optional (only used by the admin upload page to discover new clips).

This means:
- No network request needed to know which videos exist
- The service worker serves cached `.mp4` files instantly after first visit
- New clips added via admin are picked up when the admin page refreshes

### 3. Extend cache duration for videos

Increase `maxAgeSeconds` from 7 days to 30 days since these assets rarely change:

```
maxAgeSeconds: 60 * 60 * 24 * 30  // 30 days
```

### 4. Add error recovery to VideoLoopStage (from previous diagnosis)

While we're here, apply the freeze fix: when a player errors on a missing file, skip to the next clip instead of freezing the chain.

## Result

- First visit: videos download once and are cached by the service worker
- Subsequent visits: videos load instantly from cache, zero network requests
- No storage API call needed on startup
- Missing files no longer freeze the loop

