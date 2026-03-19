

## Problem

The Mock Test button is missing from the IELTS student dashboard because `LeftPillar.tsx` has a hardcoded 3-item practice mode grid (lines 98-146) that does not include a Mock Test option. The `PracticeModeGrid` component — which correctly adds a Mock Test card for IELTS students — exists but is never imported or rendered.

## Plan

**File: `src/components/student/LeftPillar.tsx`**

Add a 4th Mock Test button to the practice modes grid when `courseType === "ielts"`:

1. Import `ClipboardCheck` from lucide-react
2. Build the modes array dynamically: start with the 3 base modes, then push a Mock Test entry (`{ key: "mock-test", label: "Mock", icon: ClipboardCheck, color: "#10b981", ... }`) when `courseType === "ielts"`
3. Switch grid from `grid-cols-3` to `grid-cols-2 sm:grid-cols-4` when there are 4 items (or use a 2x2 layout for the 4-mode case to keep buttons large enough)
4. The Mock Test button navigates to `/ielts/mock-test` and uses an emerald/teal color scheme consistent with `PracticeModeGrid`

No new files, no database changes.

