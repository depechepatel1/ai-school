

## Plan: DevNav Cleanup + Auth Video Alignment

### 1. Remove "Landing" from DevNav (`src/components/DevNav.tsx`)
Delete the `{ path: "/", label: "Landing" }` entry from the `routes` array (line 7). The `/` route and `/signup` render the same page, so only "Signup" needs to remain.

### 2. Fix Auth Screen Video Alignment (`src/components/PageShell.tsx`)
The floating card occupies the right 40% of the 1024px frame. The visible background area is the left 60%. To center the video subject in that visible area, `objectPosition` should be `30% center` (half of 60%).

Line 71 currently reads: `const objectPosition = fullWidth ? "center center" : "30% center";`

This is already correct. No change needed — auth pages are non-fullWidth and already get `30% center`.

**However**, the memory note mentions auth pages previously used `96% center`. Let me verify the current value is indeed `30%` — confirmed on line 71. The value is correct as-is. The video subject will be centered between the left screen edge and the left edge of the floating card.

### Files changed
- `src/components/DevNav.tsx` — remove line 7 (Landing route)

