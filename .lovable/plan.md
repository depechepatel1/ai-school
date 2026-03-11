

## Problem: DevToolbar Navigation Crashes the App

**Root cause**: The DevToolbar uses `window.location.href = path` for all page navigation, which forces a **full page reload** of the preview iframe. In the Lovable preview environment, this:
1. Destroys the current React app state entirely
2. Reloads the entire SPA from scratch
3. Resets the auth context — `user` becomes `null` during re-initialization
4. Pages that depend on authenticated data (curriculum, timer settings) issue network requests that may stall or fail silently, leaving the loading spinner stuck

The session replay confirms: after clicking a DevToolbar link to `/igcse/speaking`, the page shows a loading spinner that never resolves.

**The sign-in buttons have the same problem** — they use `window.location.href` after `signInWithPassword`, which races with the auth state change and can drop the session.

---

## Fix Plan

### 1. Convert DevToolbar to use React Router navigation
- Import `useNavigate` from `react-router-dom`
- Replace all `window.location.href = path` calls in `handleNav` with `navigate(path)`
- Replace `window.location.href` in `handleSignIn` with `navigate(redirectPath)`
- Replace `window.location.href = "/login"` in `handleSignOut` with `navigate("/login")`
- Replace `window.location.pathname` comparison with `useLocation().pathname`

### 2. Remove unnecessary `forwardRef` wrapper
- DevToolbar uses `forwardRef` but is never passed a ref from `App.tsx` — this causes the "Function components cannot be given refs" console warning
- Convert to a plain function component (remove `forwardRef`, use a regular `ref` on the inner div if needed)

These two changes will eliminate the full-page reloads, the stuck spinners, and the forwardRef console warnings.

