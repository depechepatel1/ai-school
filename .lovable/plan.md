

## Current State

- **Login, Signup, ForgotPassword**: Already have the "AI School" header with NeuralLogo branding.
- **TeacherDashboard**: Has "Teacher" label with "Manage classes & students" subtitle, but no "AI School" branding.
- **ParentDashboard**: Has "Parent Portal" label with "Monitor your child's progress" subtitle, but no "AI School" branding.
- **StudentPractice**: Has no header label at all — jumps straight into the chat sidebar/content area.

There is only **one Login page** shared by all roles. The "3 types" the user refers to are the 3 **dashboard pages** after login (Student, Teacher, Parent).

## Plan

### 1. Add consistent "AI School" + role label headers to all 3 dashboards

Each dashboard will get a compact header strip at the top with:
- NeuralLogo + "AI School" title (consistent branding)
- A role-specific colored badge/pill below (e.g., "Student Portal", "Teacher Portal", "Parent Portal") with role-appropriate icon and color
- Sign Out button aligned to the right

**StudentPractice.tsx**: Add a compact header bar above the chat area with NeuralLogo, "AI School" title, a blue "Student" badge with GraduationCap icon, and Sign Out on the right.

**TeacherDashboard.tsx**: Restructure existing header to add "AI School" title above "Teacher Portal" badge (emerald colored, BookOpen icon).

**ParentDashboard.tsx**: Same treatment — add "AI School" title above "Parent Portal" badge (rose colored, Heart icon).

### 2. Suggested Improvements

Here are concrete improvements to consider for the app:

1. **Landing page has its own iPad frame** — it duplicates the entire PageShell layout (video, dev panel, compliance footer) instead of using PageShell. Refactoring it to use PageShell would eliminate ~100 lines of duplicate code and ensure consistent behavior.

2. **No email verification feedback on Login** — after signup, users are told to verify email, but if they try to log in without verifying, the error message is generic. A specific "Please verify your email first" message would improve UX.

3. **Student chat has no "AI School" context** — the AI chat currently has no system prompt visible in the code (it's in the edge function). Adding visible subject/topic selection (e.g., IELTS Speaking Part 1/2/3) would make the practice more structured.

4. **Parent "Link Account" button does nothing** — it's a static placeholder. Implementing a join-code input flow (similar to how teachers share codes) would connect the parent/student relationship.

5. **No loading state for initial data fetch** — TeacherDashboard and ParentDashboard show empty states immediately rather than a brief skeleton/spinner while data loads.

6. **Mobile responsiveness** — the entire app is locked to a 1024x768 iPad frame. On actual mobile devices, the frame is tiny. Consider adding responsive breakpoints or a mobile-native layout.

7. **Dark mode only** — there's no theme toggle. The `next-themes` package is already installed but unused.

