

# Fix: Storage Upload "RLS Policy Violation" in Timing Worker

## Problem
The timing worker popup uploads timing data to the `curriculums` storage bucket using the **anon key** as the Authorization bearer token. Storage RLS policies require an authenticated user (admin), so uploads fail with "new row violates row-level security policy".

## Root Cause
In `AdminCurriculumUpload.tsx`, the config sent to the worker passes `anonKey: ANON_KEY` (the public anon key). The worker then uses this as `Bearer ${anonKey}` in upload requests. The anon key identifies an anonymous user, not the logged-in admin — so RLS rejects the write.

## Fix
Pass the admin's **session access token** alongside the anon key. The worker needs both: the `apikey` header uses the anon key (required by Supabase), while `Authorization` uses the user's JWT.

### Changes

| File | Change |
|------|--------|
| `src/lib/timing-worker-channel.ts` | Add `accessToken: string` to `TimingWorkerConfig` interface |
| `src/components/admin/AdminCurriculumUpload.tsx` | Get session token via `supabase.auth.getSession()` and include it in config |
| `public/timing-worker.html` | Use `accessToken` for `Authorization` header, keep `anonKey` for `apikey` header |

### Detail

1. **`TimingWorkerConfig`** — add `accessToken` field
2. **`AdminCurriculumUpload.tsx`** — in `launchTimingJob` and `buildConfig`, call `supabase.auth.getSession()` to get the current JWT and pass as `accessToken`
3. **`timing-worker.html` `uploadTimings()`** — change `Authorization: Bearer ${anonKey}` to `Authorization: Bearer ${accessToken}`, keep `apikey: ${anonKey}`

