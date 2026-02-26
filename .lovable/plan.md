

## Unified PageShell Architecture

### Overview
Create a shared `PageShell` component that wraps all pages in the landing page's iPad-frame layout with video background and floating glass card. Signup becomes the default entry for unauthenticated users.

### Video URLs
- **Video 1** (intro, student page only): `https://res.cloudinary.com/daujjfaqg/video/upload/Video_Generation_With_Specific_Script_vlav4y.mp4`
- **Video 2** (loop, all pages): `https://res.cloudinary.com/daujjfaqg/video/upload/2026-02-26T10-21-39_add_head_nodding_knplpb.mp4`

### Video logic
- **Student page**: Video 1 plays once → on `onEnded`, swap to Video 2 looped. Video 2 preloads while Video 1 plays.
- **All other pages**: Video 2 only, looped immediately.

### Files to create
- `src/components/PageShell.tsx` — Extracts the iPad frame, video background, audio toggle, compliance footer, dev panel, and floating glass card from `LandingPage.tsx`. Accepts `children` (rendered in glass card) and `playIntroVideo?: boolean` prop (only true on student page). Glass card uses `overflow-y-auto max-h-full` but content should be designed to avoid scrolling.

### Files to modify

**`src/pages/Index.tsx`** — Redirect unauthenticated users to `/signup` instead of rendering LandingPage.

**`src/pages/Signup.tsx`** — Strip outer wrapper. Render form content inside `<PageShell>`. Compact the layout: smaller logo, tighter spacing, smaller role selector to avoid scrolling. Keep all PRC consent logic.

**`src/pages/Login.tsx`** — Strip outer wrapper. Render form inside `<PageShell>`. Compact layout with NeuralLogo + form fields + links + ICP footer.

**`src/pages/ForgotPassword.tsx`** — Strip outer wrapper. Render inside `<PageShell>`.

**`src/pages/StudentPractice.tsx`** — Wrap in `<PageShell playIntroVideo>`. The chat UI becomes the glass card content (sidebar + messages area adapted to fit within the card).

**`src/pages/TeacherDashboard.tsx`** — Wrap in `<PageShell>`. Dashboard content renders inside glass card.

**`src/pages/ParentDashboard.tsx`** — Wrap in `<PageShell>`. Dashboard content renders inside glass card.

**`src/pages/LandingPage.tsx`** — No longer used as standalone. Can be deleted or kept for reference.

### PageShell layout

```text
┌─────────────────────────────────────────────┐
│  iPad Frame (1024×768, rounded, bordered)   │
│  ┌───────────────────────┬─────────────────┐│
│  │                       │  Glass Card      ││
│  │   Video Background    │  (40% width)     ││
│  │   (Video 2 looped,    │                  ││
│  │    or V1→V2 on        │  {children}      ││
│  │    student page)      │                  ││
│  │                       │                  ││
│  │   Audio Toggle (BL)   │                  ││
│  ├───────────────────────┴─────────────────┤│
│  │  Compliance Footer                       ││
│  └──────────────────────────────────────────┘│
│  Dev Panel (top-left)                        │
└─────────────────────────────────────────────┘
```

### PageShell props
```tsx
interface PageShellProps {
  children: React.ReactNode;
  playIntroVideo?: boolean; // only for student page
}
```

### No-scroll strategy for glass card
- Signup: reduce role selector to inline pills (not tall cards), use `text-xs` labels, `gap-1` spacing, compact consent section
- Login: minimal — logo + 2 fields + button + links fits easily
- ForgotPW: minimal — logo + 1 field + button
- Dashboards: content scrolls within card if needed (these are functional pages)

### Routing changes
- `Index.tsx`: unauthenticated → redirect to `/signup`
- No new routes needed
- `LandingPage.tsx` removed from imports in `Index.tsx`

