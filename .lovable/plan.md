

## Plan: Auto-sign-in to dev account in AuthProvider

### Problem
The dev bypass in `ProtectedRoute` skips the auth gate, but `useAuth()` still returns `user: null` because there's no actual session. Every component that reads `user.id` to query data gets nothing.

### Solution
In `src/lib/auth.tsx`, add dev-mode auto-sign-in. When running in dev mode and `getSession()` returns no session, automatically sign in as `dev-igcse@test.com` / `devtest123`. This creates a real session so all database queries work.

Additionally, update `DevNav.tsx` to sign in as the correct dev account when switching roles (restore the sign-in logic that was removed earlier, but make it work properly).

### Changes

**1. `src/lib/auth.tsx`** — In the `getSession().then()` block, if `import.meta.env.DEV` and there's no session, call `supabase.auth.signInWithPassword` with the default dev student credentials. The `onAuthStateChange` listener will then pick up the new session and load the role normally.

```ts
// Inside getSession().then():
if (!session && import.meta.env.DEV) {
  console.log("[Auth] Dev mode: auto-signing in as dev-igcse@test.com");
  await supabase.auth.signInWithPassword({
    email: "dev-igcse@test.com",
    password: "devtest123",
  });
  return; // onAuthStateChange will handle the rest
}
```

**2. `src/components/DevNav.tsx`** — Restore sign-in when switching roles. When a role-based route is clicked, sign in as the corresponding dev account before navigating. This ensures the session matches the page being viewed.

```ts
const handleNav = async (route: typeof routes[0]) => {
  if (route.role && DEV_CREDENTIALS[route.role]) {
    setLoading(true);
    const creds = DEV_CREDENTIALS[route.role];
    await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.password,
    });
    setLoading(false);
  }
  navigate(route.path);
  setOpen(false);
};
```

**3. `src/pages/Index.tsx`** — Remove the dev bypass from the `useEffect`. Since the AuthProvider now auto-signs in, the normal auth flow will work: session loads → role loads → redirect to correct dashboard.

### Result
- App auto-signs in as dev student on first load — no spinner, data loads immediately
- DevNav role buttons switch the actual session so queries return the right user's data
- `ProtectedRoute` dev bypass remains as a safety net

