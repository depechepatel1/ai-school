

## Remaining Unaddressed Audit Issues — Sequenced Task Plan

Here are the issues from the audit that were **not addressed** in the previous fix round, organized in priority order. I'll create a managed task queue so you can say "next" to proceed through each one.

---

### Task Queue (in execution order)

**1. Responsive layout for Student Dashboard**
The LeftPillar and RightPillar use `absolute` positioning with fixed `w-[280px]`. On viewports below ~700px they overlap the center content. Fix: hide pillars on small screens or convert to a mobile-friendly stacked layout with a toggle/drawer.

**2. Responsive layout for Speaking Studio pages**
`CueCard`, `FreehandNotePad`, and `SpeakingLeftPanel` all use absolute positioning with fixed widths. These need mobile breakpoints or drawer alternatives.

**3. Responsive layout for StudentAnalysis page**
The analytics page uses fixed-size `ProgressRing` (120px) and multi-column grid that doesn't collapse well on mobile. Needs responsive grid adjustments.

**4. AdminDashboard direct Supabase imports**
`AdminDashboard.tsx` imports `supabase` client directly (line 9) instead of going through `src/services/db.ts`. Should be refactored to use the service layer for consistency and maintainability.

**5. Build real streak tracking system**
RightPillar currently shows "— Day Streak" and "— Days Off". Need to compute actual consecutive practice days from `student_practice_logs` table and display real counts.

**6. Replace sample tasks with real task/assignment system**
LeftPillar shows hardcoded "Sample Tasks". Need a `student_tasks` or `assignments` table that teachers can populate, and query it dynamically.

**7. Parent Dashboard "Link Child" — real implementation**
Currently shows a "Coming Soon" toast. Needs a `parent_student_links` table and a flow where parents enter a child's student code/email to link accounts.

**8. Empty state handling across all list views**
Teacher class lists, admin user lists, leaderboards, and message tabs lack proper empty-state UI when no data exists. Add friendly empty states with guidance text.

---

### How It Works

When you say **"next"** (or "go", "continue", etc.), I will implement the next task in the queue, mark it done, and wait for your prompt to proceed to the following one. This gives you control to review each change before moving on.

Ready when you are — say **"next"** to start with Task 1 (Responsive Student Dashboard).

