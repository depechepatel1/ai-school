

# Phase 1: Critical Security and Stability Fixes

This plan covers items 1.1 through 1.6. Subsequent phases will follow in later messages.

---

## 1.1 Fix JWT Validation in `deepseek-chat`

**File:** `supabase/functions/deepseek-chat/index.ts`

The `getClaims()` method actually does exist on newer Supabase JS client versions and is the recommended pattern per the project's own edge function docs. However, to be safe and consistent, replace with `getUser()` which is universally supported:

```typescript
// Replace getClaims block with:
const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
if (userError || !user) {
  return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, ... });
}
```

## 1.2 Fix SQL Injection in `admin-manage-users`

**File:** `supabase/functions/admin-manage-users/index.ts` (line 118)

Replace the `.or()` string interpolation with two separate delete calls:

```typescript
await adminClient.from("parent_student_links").delete().eq("parent_id", user_id);
await adminClient.from("parent_student_links").delete().eq("student_id", user_id);
```

## 1.3 Add Auth to Unprotected Edge Functions

**Files:** 6 edge functions (excluding `create-dev-accounts` which is a dev-only utility and `check-video-headers`)

Add an auth guard to the top of each function. For admin-only functions (`import-curriculum`, `upload-curriculum`, `upload-video-file`, `upload-videos`, `upload-analysis-video`), require admin role. For `punctuate`, require any authenticated user.

Pattern for admin functions:
```typescript
const authHeader = req.headers.get("Authorization");
if (!authHeader) return respond(401, { error: "Unauthorized" });
const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
const { data: { user } } = await callerClient.auth.getUser();
if (!user) return respond(401, { error: "Unauthorized" });
// For admin-only: check role via service role client
```

For `punctuate` (called by students during practice): require authenticated user only.

## 1.4 Fix Auth Race Condition

**File:** `src/lib/auth.tsx`

Remove `setTimeout(() => loadRole(...), 0)` and instead await the role inline, setting loading false only after role resolves:

```typescript
onAuthStateChange(async (_event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
  if (session?.user) {
    await loadRole(session.user.id);
    preloadVoices(); preloadAccent("uk"); preloadAccent("us");
  } else {
    setRole(null);
  }
  setLoading(false);
});
```

Same pattern for the `getSession()` block below it (remove the separate `setLoading(false)` call that fires before role loads).

## 1.5 Fix Memory Leaks

### `src/hooks/useAudioCapture.ts`
- In `recorder.onstop`, call `URL.revokeObjectURL()` on the previous `lastRecordingUrl` before creating a new one
- Add cleanup in a `useEffect` return to revoke on unmount

### `src/hooks/useSpeakingTest.ts`
- Lines 159, 163, 223, 230: Store `setTimeout` return values in refs and clear them on unmount via a cleanup `useEffect`

### `src/hooks/use-toast.ts`
- The listener cleanup already exists (lines 153-157 splice on unmount). The global `listeners` array is by design. No change needed here — this is a false positive in the audit.

## 1.6 Dev Credentials

**File:** `src/components/DevNav.tsx`

The PageShell dev panel was already removed in the previous consolidation. `DevNav.tsx` still has hardcoded credentials. Options:
- Gate the entire `DevNav` component behind `import.meta.env.DEV` so it never renders in production builds
- Move credentials to environment variables

Recommended: Wrap the component render in `if (!import.meta.env.DEV) return null;` at the top. This is the simplest fix — Vite tree-shakes the entire component out of production builds.

Also gate `create-dev-accounts` edge function with an environment check or admin auth.

---

## Summary of Changes

| Item | Files Modified | Risk |
|------|---------------|------|
| 1.1 | `deepseek-chat/index.ts` | Low |
| 1.2 | `admin-manage-users/index.ts` | Low |
| 1.3 | 6 edge functions | Medium — test each after |
| 1.4 | `src/lib/auth.tsx` | Medium — affects login flow |
| 1.5 | `useAudioCapture.ts`, `useSpeakingTest.ts` | Low |
| 1.6 | `DevNav.tsx` | Low |

