

## Problem

The root route (`/`) in `Index.tsx` waits for `loading` and `roleLoading` to both be false before redirecting. In dev mode with no logged-in user, the auth provider still takes time to resolve (up to 5 seconds via the safety timeout), so you see a spinner.

The `ProtectedRoute` already has the `DEV_BYPASS_AUTH` fix, but `Index.tsx` does not — it independently gates on auth state.

## Fix

**`src/pages/Index.tsx`** — In dev mode, skip the loading gate and redirect immediately to a default dev landing page (e.g. `/student`):

```tsx
useEffect(() => {
  if (import.meta.env.DEV) {
    navigate("/student", { replace: true });
    return;
  }
  if (loading || roleLoading) return;
  if (!user) {
    navigate("/signup", { replace: true });
    return;
  }
  const routes = { student: "/select-week", teacher: "/teacher", parent: "/parent", admin: "/admin" };
  navigate(routes[role ?? ""] || "/signup", { replace: true });
}, [user, role, loading, roleLoading, navigate]);
```

This is a single-line addition at the top of the `useEffect`. In production, the existing auth-gated flow remains unchanged. In dev, the page redirects instantly to `/student` (you can then use the DevToolbar to go anywhere else).

