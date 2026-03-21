

# Fix: Extend Tasks panel & flatten Welcome modal

## 1. Tasks/Messages panel not reaching bottom

The LeftPillar container has `bottom-24` (96px from bottom). Change to `bottom-4` so the column extends nearly to the screen bottom, giving the Tasks/Messages panel much more vertical space.

**File:** `src/components/student/LeftPillar.tsx` line 53  
- Change `bottom-24` → `bottom-4`

## 2. Welcome modal still obscures teacher's face

The current modal is a tall vertical card (`w-[520px]`) centered at the bottom. Redesign as a **full-width horizontal banner** pinned to the very bottom of the screen:

**File:** `src/components/student/WelcomeModal.tsx`
- Outer container: full-width bar at bottom, `pb-0`, no centering
- Inner card: `w-full max-w-[100vw]` horizontal layout, reduced height
- Arrange the 3 practice mode tips in a **horizontal row** (flex-row) instead of stacked vertically
- Compact padding, smaller text, single-line descriptions
- Place heading + CTA button inline at the edges
- Keep dismiss X button, keep slide-up animation

Result: a slim bottom banner (~120px tall) spanning the screen width, leaving the teacher's face completely visible.

