

## Performance Bottleneck Analysis

After reviewing the codebase, here are the identified bottlenecks ranked by impact:

---

### 1. Admin Analytics fetches ALL logs without pagination
**File**: `src/components/admin/AdminAnalyticsPanel.tsx` (line 43-46)

The panel fetches the entire `student_practice_logs` table on mount with no date filter or limit. As data grows, this becomes the single biggest bottleneck. It then filters client-side with `useMemo`. The `profiles` table is also fetched in full.

**Fix**: Add server-side date filtering to the initial query based on the default preset ("semester"). Only re-fetch when the date range changes. Use React Query for caching.

---

### 2. Duplicate network requests on navigation
**Network logs** show `student_practice_logs` and `profiles` being fetched twice in quick succession (03:02:58 and 03:04:12). This happens because the Admin dashboard unmounts/remounts or because `useEffect` dependencies trigger redundant fetches.

**Fix**: Wrap admin data fetching in React Query with `staleTime` so repeated navigations use cached data.

---

### 3. SpeakingStudio is a 564-line monolith with 15+ imports
**File**: `src/pages/SpeakingStudio.tsx`

This page eagerly imports ~15 components and ~10 hooks on mount. Even with lazy route loading, the chunk is very large. Many sub-components (PronunciationVisualizer, ProsodyVisualizer, CueCard, FreehandNotePad) are only needed in specific modes.

**Fix**: Conditionally lazy-load mode-specific components (e.g., only load ProsodyVisualizer when in fluency mode).

---

### 4. Video prefetching still competes with critical resources
**File**: `src/App.tsx` (lines 49-74)

Even with the deferred prefetch optimization, `<link rel="prefetch">` for the first video clip fires immediately on app mount — before auth resolves. On slow connections, this competes with the auth token refresh and role fetch.

**Fix**: Move video prefetching into the student dashboard page itself (only students see videos), not the root App. Other roles (admin, teacher) don't need video prefetching at all.

---

### 5. TTS voice preloading fires on every login
**File**: `src/lib/auth.tsx` (lines 52-54)

`preloadVoices()` and two `preloadAccent()` calls fire inside the auth listener for every authenticated user, including admins and teachers who never use TTS.

**Fix**: Move TTS preloading into the SpeakingStudio or StudentPractice pages where it's actually needed.

---

### 6. No React Query — all data hooks use raw useState/useEffect
**Files**: `useAnalyticsData.ts`, `useStreak.ts`, `useCourseWeek.ts`, `useXP.ts`

Every hook re-fetches on mount with no caching, deduplication, or stale-while-revalidate. Navigating away and back triggers fresh network requests each time.

**Fix**: Migrate data-fetching hooks to React Query (already installed as `@tanstack/react-query`). This gives automatic caching, deduplication, and background refetch.

---

### 7. AdminDashboard eagerly imports all 8 tab panels
**File**: `src/pages/AdminDashboard.tsx` (lines 7-15)

All 8 admin panels (Analytics, Users, Classes, Practice, Conversations, Audit, Timers, Curriculum) are statically imported. Only one is visible at a time.

**Fix**: Use `React.lazy` for each tab panel so only the active tab's code is loaded.

---

### Summary of recommended changes

| Priority | Bottleneck | Fix | Impact |
|----------|-----------|-----|--------|
| **P0** | Admin fetches all logs | Server-side date filter + React Query | Eliminates unbounded query |
| **P0** | No data caching | Migrate hooks to React Query | Eliminates duplicate fetches |
| **P1** | Video prefetch in root App | Move to student pages only | Faster auth for non-students |
| **P1** | TTS preload for all roles | Move to speaking pages | Faster admin/teacher load |
| **P1** | Admin imports all tabs | Lazy-load tab panels | Smaller initial chunk |
| **P2** | SpeakingStudio monolith | Lazy-load mode-specific components | Smaller chunk size |

