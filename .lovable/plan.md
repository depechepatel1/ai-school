

## UI Design Improvements for the Tasks/Messages Panel

After reviewing the current implementation, here are the key issues and proposed refinements:

### Current Problems
1. **Tab switcher** is plain text with no visual indicator for the active state -- just a color change from gray to white. No underline, pill, or background differentiation.
2. **Task cards are visually dense** -- every card uses the same rounded-xl shape, same padding, same icon-left layout. There is no breathing room or visual rhythm.
3. **Section headers** ("Daily Routine", "Upcoming") are tiny 10px uppercase labels that blend into the background, offering weak visual separation.
4. **The priority task card** uses a pulsing red overlay which is distracting and feels like an error state rather than an urgent-but-positive call to action.
5. **Icon containers** are all the same size and shape (p-2 rounded-lg), creating monotony across 8+ items in a narrow column.
6. **No progress indicators** -- tasks have no completion state, progress bar, or checkmark to show what has been done vs. what remains.
7. **Messages tab** items all look identical with no unread/read distinction.

### Proposed Changes

#### 1. Animated tab indicator
Replace the plain text tabs with a sliding pill indicator behind the active tab. A small `rounded-full bg-white/10` element animates horizontally between "Tasks" and "Messages" using a CSS translate transition.

#### 2. Section dividers with subtle line + label
Replace the floating 10px labels with a horizontal rule pattern: a thin `border-white/[0.06]` line with the label centered inside a small `bg-black/40` background chip, creating a clear visual break between groups.

#### 3. Priority task card refinement
- Remove the `animate-pulse` red overlay (too aggressive)
- Add a thin animated gradient border (`background-size: 200%` with `animate-gradient-x`) using orange-to-red tones instead of flat red
- Replace the solid red CTA button with a gradient `from-orange-500 to-red-500` with a subtle glow on hover
- Add a small circular progress ring (e.g., "3/12 done") to the top-right corner instead of the "Today" pill

#### 4. Task item micro-progress
Add a thin 2px progress bar at the bottom of each daily routine/upcoming card showing completion (e.g., Vocabulary quiz: 60% done). Use the item's accent color at low opacity.

#### 5. Unread dot for messages
Add a small 6px colored dot on the left edge of unread messages (first 2 items). Read messages get slightly lower opacity (`opacity-70`).

#### 6. Staggered entrance animation
Add `animate-fade-in-up` with increasing `animation-delay` (50ms increments) to each task card for a polished load-in feel.

### Implementation

**File: `src/components/student/LeftPillar.tsx`**
- Replace tab bar with sliding pill indicator using a `div` with `transition-transform` keyed to `activeTab`
- Update section header markup to use centered-line-with-chip pattern
- Refactor priority card: remove pulse overlay, add gradient border wrapper, add progress ring
- Add 2px bottom progress bars to routine items
- Add unread dot to first 2 message items
- Add staggered `style={{ animationDelay }}` to each card

**File: `src/index.css`**
- Add a `@keyframes slide-tab` if needed for the pill indicator (or handle with Tailwind translate classes)

