

# Performance Audit: Admin Dashboard

## Findings

### Measured Metrics
- **First Contentful Paint**: 4080ms (poor — target is <1800ms)
- **DOM Content Loaded**: 3989ms
- **75 script requests** loaded during page init, averaging ~389ms each
- **4 video files** fetched on admin page (unnecessary — admin uses a static `bgImage`)
- **Live2D Cubism SDK** loaded as render-blocking script in `index.html` (400ms)
- **150 total network requests** on page load

### Root Causes (ordered by impact)

1. **Render-blocking Live2D script** (`index.html` line 16): `live2dcubismcore.min.js` blocks parsing for 400ms. The avatar provider is set to `"video"` — Live2D is unused.

2. **Videos loaded on admin page**: `PageShell` renders `BackgroundStage > VideoLoopStage` which preloads 13 video URLs and starts fetching loop-stack mp4s. The admin page passes `bgImage` which should skip this, but `VideoLoopStage` still mounts briefly and triggers fetches.

3. **DevNav and GlobalOmniChat always mounted**: Both are eagerly imported in `App.tsx` (not lazy), loaded on every route including admin. DevNav imports framer-motion, supabase, and prefetch utilities. GlobalOmniChat imports the full OmniChatModal tree.

4. **No query limit on analytics**: `AdminAnalyticsPanel` fetches ALL `student_practice_logs` for the semester with no `.limit()` — could be thousands of rows fetched on first tab render.

5. **Waterfall of module imports**: Vite dev server serves each file individually. The deep import chain (App → AuthProvider → db.ts → supabase client) creates sequential waterfalls. `db.ts` alone takes 870ms due to its position in the chain.

---

## Plan

### Fix 1 — Remove render-blocking Live2D script
In `index.html`, change the Live2D `<script>` to `async` or remove it entirely since the avatar provider is `"video"`. This saves ~400ms off TTFB-to-FCP.

### Fix 2 — Skip video loading on bgImage pages
In `PageShell.tsx`, when `bgImage` is provided, don't render `BackgroundStage` at all (it's already behind the `bgImage` branch, but verify `VideoLoopStage` isn't mounted). Additionally, in `VideoLoopStage`, guard against mounting when not visible.

### Fix 3 — Lazy-load DevNav and GlobalOmniChat
In `App.tsx`, convert `DevNav` and `GlobalOmniChat` from eager imports to `React.lazy()`. These are not needed for initial render.

### Fix 4 — Add pagination/limit to admin analytics queries
In `AdminAnalyticsPanel.tsx`, add `.limit(1000)` to the practice logs query (it already caps at 1000 by default, but make it explicit). Consider server-side aggregation for semester-wide stats.

### Fix 5 — Defer CurriculumUpload timing status checks
In `AdminCurriculumUpload.tsx`, `checkTimingStatus` fires 3 HEAD requests on mount. Since this panel is lazy-loaded and only visible when the "Curriculum" tab is active, this is already deferred — no change needed.

### Technical Details

```text
Files to edit:
├── index.html                          (Fix 1: async Live2D script)
├── src/App.tsx                         (Fix 3: lazy DevNav + GlobalOmniChat)
├── src/components/PageShell.tsx        (Fix 2: verify no video on bgImage)
└── src/components/admin/
    └── AdminAnalyticsPanel.tsx         (Fix 4: explicit query limit)
```

**Expected improvement**: FCP should drop from ~4s to ~2.5–3s. The render-blocking script removal alone saves 400ms, lazy-loading global components saves another 300–500ms of JS parsing, and eliminating unnecessary video fetches removes 4+ wasted network requests.

