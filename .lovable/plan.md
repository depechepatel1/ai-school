

## Plan: Add Temporary Dev Auth Bypass

Two files need changes to make the app fully browsable in dev mode:

### 1. `src/components/ProtectedRoute.tsx`
Add `if (import.meta.env.DEV) return <>{children}</>` at the top of the component, before any auth checks. This lets all protected routes render without authentication.

### 2. `src/pages/Index.tsx`
The Index page also blocks on auth — it shows a spinner until `user` and `role` are loaded, then redirects. In dev mode, skip the auth check and immediately redirect to `/student` (or `/select-week`) so you don't get stuck on the spinner.

Add at the top of the `useEffect`:
```ts
if (import.meta.env.DEV) {
  navigate("/select-week", { replace: true });
  return;
}
```

Both bypasses are gated by `import.meta.env.DEV` so they're tree-shaken from production builds.

