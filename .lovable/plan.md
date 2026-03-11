

## Fix Plan: Sequential Bug Fixes

Four targeted fixes, applied one at a time. No refactoring, no behavior changes.

---

### Fix 1: Eliminate `forwardRef` console warnings

**Problem**: React Router v6 passes refs to route element components. `ProtectedRoute`, `PageLoader`, and `DevToolbar` are plain function components that can't accept refs, generating 3 console errors on every page load.

**Fix**: Wrap all three with `React.forwardRef`. This is a no-op functionally — it just silences the warning by accepting and discarding the ref.

- `src/components/ProtectedRoute.tsx` — wrap with `forwardRef`
- `src/components/DevToolbar.tsx` — wrap with `forwardRef`  
- `src/App.tsx` — wrap `PageLoader` with `forwardRef`

---

### Fix 2: Fix `signOut` leaving `roleLoading: true`

**Problem**: In `src/lib/auth.tsx` line 126, `signOut` sets `roleLoading(true)` but the `onAuthStateChange` handler for a logged-out session (line 69) sets `role(null)` but never sets `roleLoading(false)`. If someone signs out and the `onAuthStateChange` fires with `session === null`, `roleLoading` stays `true` forever, causing `ProtectedRoute` to show an infinite spinner on next visit.

**Fix**: In `signOut`, set `roleLoading(false)` instead of `true` (since there's no role to load for a logged-out user).

---

### Fix 3: Add error handling to `StudentProfile` `fetchProfile`

**Problem**: `StudentProfile.tsx` line 29 calls `fetchProfile(user.id).then(...)` with no `.catch()`. If the network request fails, the promise rejects silently and the profile fields stay empty with no feedback.

**Fix**: Add `.catch()` that shows a toast error and still sets `loaded = true` so the UI doesn't hang.

---

### Fix 4: Add timeout fallback to `WeekSelection` loading state

**Problem**: If `useCourseWeek` fails or hangs, `WeekSelection` shows a spinner forever with no escape.

**Fix**: Add a 10-second timeout that sets a local `timedOut` flag, showing an error message with a retry button alongside the spinner fallback.

