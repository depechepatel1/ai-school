

## Plan: Subtle Background for Teacher & Admin Dashboards + Full-Width Layout

### 1. Download & Store the Video
- Fetch the Cloudinary video from `https://res.cloudinary.com/daujjfaqg/video/upload/Subtle_Background_Animation_Generation_brjkvo.mp4`
- Upload it to the existing Supabase `videos` storage bucket as `dashboard-bg.mp4`
- Define a constant for the URL in a shared location

### 2. Ping-Pong (Forward-Backward) Playback
HTML5 `<video>` does not reliably support negative `playbackRate`. Instead:
- Add a `pingPong` prop to `PageShell`
- When `pingPong` is enabled, use a `requestAnimationFrame` loop that manually increments/decrements `currentTime` on the video element
- When the video reaches the end, reverse direction; when it reaches the start, go forward again
- This produces smooth forward-then-backward looping using the same isolated `<video>` player already in PageShell
- Set `loop={false}` and `pause()` the native player — the rAF loop drives playback

### 3. Pass `fullWidth` + New Video to Teacher & Admin Dashboards
- **TeacherDashboard.tsx**: Change `<PageShell>` to `<PageShell fullWidth loopVideos={[DASHBOARD_BG_VIDEO]} pingPong>`
- **AdminDashboard.tsx**: Same change

### 4. Redesign Teacher Dashboard Layout (Full-Width)
Currently renders in a 40%-width glass card. With `fullWidth`, wrap content in a full-screen glass overlay (like StudentProfile/StudentAnalysis pattern):
- Use a centered glassmorphic container spanning most of the screen (`inset-4` or similar)
- **Header row**: Logo + Teacher badge on left, language toggle + sign out on right — now in a wider horizontal bar
- **Create class**: Input + button + course type selector in a single horizontal row instead of stacked
- **Classes grid**: Switch from vertical list to a 2-column or 3-column grid of class cards
- **Feature cards**: Place in a horizontal row at the bottom
- **ClassDetailPanel**: Also benefits from wider layout — place summary cards and chart side-by-side

### 5. Redesign Admin Dashboard Layout (Full-Width)
Same glass overlay wrapper. The extra width allows:
- **Tabs**: Can show full labels more comfortably in a horizontal bar
- **Analytics panel**: Put KPI cards in a wider row; place charts side-by-side (2-column grid for bar chart + area chart, 2-column for pie + growth)
- **Users panel**: Show more columns in the user table (display name, role, created date, actions all visible)
- **All panels**: Get more breathing room with the wider container

### Technical Details

**PageShell changes** (`src/components/PageShell.tsx`):
- New prop: `pingPong?: boolean`
- When `pingPong` is true and the loop video is loaded:
  - Pause native playback
  - Start a rAF loop: `currentTime += direction * (deltaMs / 1000)`, clamped to `[0, duration]`
  - Flip `direction` at boundaries
  - Set `video.currentTime` each frame

**Files to modify**:
1. `src/components/PageShell.tsx` — add `pingPong` prop + rAF logic
2. `src/pages/TeacherDashboard.tsx` — `fullWidth` + new video + wider layout
3. `src/pages/AdminDashboard.tsx` — `fullWidth` + new video + wider layout
4. `src/components/teacher/ClassDetailPanel.tsx` — adjust for wider container

