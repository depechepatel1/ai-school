

## Consolidate Dev Navigation

**Problem:** Two separate dev nav panels exist:
1. **DevNav** (`src/components/DevNav.tsx`) — bottom-right floating button, shows route links + auto-login by role
2. **PageShell Dev Panel** (inline in `src/components/PageShell.tsx`) — top-left button on every PageShell page, shows "Quick Login As" with 5 role accounts

Both do the same thing (dev login + navigate). They overlap visually and clutter the UI.

**Solution:** Keep **DevNav** as the single dev tool (it already covers all routes + role login) and remove the inline dev panel from PageShell.

### Changes

1. **`src/components/PageShell.tsx`**
   - Remove the `DEV_ACCOUNTS` array, `devOpen`/`devLoading` state, `handleDevLogin` function
   - Remove the entire "Dev Login Panel" JSX block (lines 112-155)
   - Remove unused imports (`Code`, `GraduationCap`, `BookOpen`, `Heart`, `Shield`, `AnimatePresence`, `motion`, `supabase`, `toast`, `getSafeErrorMessage`)

2. **`src/components/DevNav.tsx`**
   - Already has all routes + role-based auto-login — no changes needed

3. **`src/App.tsx`**
   - Already renders `<DevNav />` globally — no changes needed

One dev panel, bottom-right, accessible from every page.

