

## Student Analysis Screen — Progress Charts with Semester Calendar

### Constants
- `SEMESTER_START = "2026-03-02"` (Week 1 begins Monday 2nd March 2026)
- `SEMESTER_WEEKS = 20` (20-week semester)
- WeekSelector capped at 20 (not 40)
- Week number derived from date: `Math.ceil((today - SEMESTER_START) / 7)`

### Step 1: Create edge function to download & store background video
- `upload-analysis-video`: downloads `https://res.cloudinary.com/daujjfaqg/video/upload/2026-02-28T11-06-56_softly_atmospheric_ssio5s.mp4` → uploads to `videos` bucket as `analysis-bg.mp4`
- Deploy and invoke once

### Step 2: Add semester constants file
- `src/lib/semester.ts`: exports `SEMESTER_START`, `SEMESTER_WEEKS`, `getWeekNumber(date)`, `getWeekDateRange(weekNum)`, `isWithinSemester(date)`

### Step 3: Update WeekSelector max to 20
- Change default `maxWeek` from 40 to 20
- Also update `useCourseWeek` wrap logic: `shadowingWeek` wraps at 20 not 40

### Step 4: Create `src/hooks/useAnalyticsData.ts`
- Fetches `student_practice_logs` for the current user
- Groups by time period: daily (today), weekly (current week), monthly (current month), total (all-time within semester)
- Returns aggregated seconds per activity type for each period
- Uses `SEMESTER_START` to calculate correct week boundaries

### Step 5: Create `src/pages/StudentAnalysis.tsx`
- **Layout**: `PageShell` with `fullWidth`, `loopVideos={[analysisVideoUrl]}`
- **Glass card**: Full-screen `bg-black/40 backdrop-blur-3xl border border-white/10 rounded-3xl`
- **Tab bar**: Daily | Weekly | Monthly | Total — switches the view period
- **Three circular progress rings** (SVG): Shadowing (cyan), Pronunciation (orange), Speaking (purple)
  - Each shows time spent / target, percentage, and overtime badge
  - Daily targets from `TIME_TARGETS`; weekly = daily × 5 (school days); monthly = daily × 20; total = daily × weeks elapsed × 5
- **Bar chart row** below rings: recharts `BarChart` showing per-day breakdown for weekly view, per-week for monthly, per-week for total
- **Back button** to `/student`
- **Course badge** (IELTS/IGCSE) in header

### Step 6: Prefetch analysis video in App.tsx
- Add `${SUPABASE_URL}/storage/v1/object/public/videos/analysis-bg.mp4` to `VIDEO_URLS` array

### Step 7: Add route `/analysis` in App.tsx
- Protected for `student` role

### Step 8: Add navigation button in BottomDock
- Replace the placeholder "Ranking" (Trophy) button with an "Analysis" (BarChart3) button that navigates to `/analysis`

### Technical Details

**Circular progress ring**: SVG with `stroke-dasharray={circumference}` and `stroke-dashoffset={circumference * (1 - pct)}`, animated via CSS transition. Percentage capped at 100% visually; overtime shown as text badge.

**Data query for weekly view**:
```sql
SELECT activity_type, DATE(created_at) as day, SUM(active_seconds) 
FROM student_practice_logs 
WHERE user_id = ? AND created_at >= weekStart AND created_at < weekEnd
GROUP BY activity_type, day
```

**Glass card layout**:
```text
┌──────────────────────────────────────────────┐
│  ← Back    Daily Practice   [IELTS] W3/20   │
│  [Daily] [Weekly] [Monthly] [Total]          │
│                                              │
│  ┌──────┐    ┌──────┐    ┌──────┐            │
│  │  ◯   │    │  ◯   │    │  ◯   │            │
│  │ 75%  │    │ 100% │    │ 50%  │            │
│  │Shadow │    │Pronun│    │Speak │            │
│  │7:30   │    │10:00 │    │5:00  │            │
│  │/10:00 │    │/10:00│    │/10:00│            │
│  └──────┘    └──────┘    └──────┘            │
│                                              │
│  ┌──────────────────────────────────┐        │
│  │  ▐▐  ▐▐  ▐▐  ▐▐  ▐▐  (bar chart)│       │
│  └──────────────────────────────────┘        │
│                                              │
│  Total: 22:30 today                          │
└──────────────────────────────────────────────┘
```

