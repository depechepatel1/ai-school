

## Plan: Fix Video Playback

### Root Cause

The video player logic is intact and correct. The problem is twofold:

1. **MIME type on `loop-stack/10.mp4`** is still `application/octet-stream` (the upload-videos function missed it or failed on that file). All other loop-stack files show `video/mp4` in the database.

2. **CDN cache** — Even though most files now have correct MIME types in the database, the Supabase CDN (Cloudflare) is likely still serving cached responses with the old `application/octet-stream` content-type header. This explains why error code 4 fires on files like `1.mp4` that already have the correct MIME in the DB.

### Fix

**1. Fix `10.mp4` MIME type via SQL migration**
Update the metadata for the one remaining file:
```sql
UPDATE storage.objects 
SET metadata = jsonb_set(metadata, '{mimetype}', '"video/mp4"')
WHERE bucket_id = 'videos' AND name = 'loop-stack/10.mp4';
```

**2. Add cache-busting to video URLs** (`src/components/stage/VideoLoopStage.tsx`)
Append a version query param to all video URLs to force the CDN to serve fresh responses:
```typescript
const CACHE_BUST = "?v=2";
const VIDEO_INTRO = `${STORAGE_BASE}/intro.mp4${CACHE_BUST}`;

export const VIDEO_LOOP_STACK = [
  `${STORAGE_BASE}/loop-stack/1.mp4${CACHE_BUST}`,
  // ... all 10
];
```

Also update the analysis-bg video URL in any page that uses it.

**3. No changes to player logic** — The A/B player, `safePlay`, `handlePlayerEnded`, intro handling, and `sessionStorage` gating are all correct. The `introFinished` state correctly gates `handleCanPlayA` so Player A only auto-starts after the intro ends (or immediately if no intro). The student dashboard correctly passes `playIntroVideo` and `loopVideos={VIDEO_1_STACK}`.

### Files Changed
- SQL migration: fix `10.mp4` MIME type
- `src/components/stage/VideoLoopStage.tsx` — add cache-bust param to all URLs
- `src/pages/StudentAnalysis.tsx` — add cache-bust to analysis-bg URL if present

