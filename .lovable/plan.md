

# IELTS Mock Test — Full Redesign Plan

## Current State

The mock test is embedded inside the 564-line `SpeakingStudio.tsx` monolith as a "speaking" mode toggle. It uses `useSpeakingTest` hook for state management, with small inline components for config, cue card, feedback, and save. Per project memory, SpeakingStudio is designated for retirement once this logic is extracted.

**Current problems:**
- No dedicated route — hidden behind a mode toggle in `/speaking`
- Tiny config panel (ExaminerConfig) — just 3 checkboxes, no topic preview or timing info
- No proper part transition screens — just a countdown number and a "Start Next Part" button
- Cue card is hardcoded (`PART2_TOPIC`) — not pulled from curriculum
- No band score breakdown UI — just raw markdown from AI
- No session history or downloadable report
- No iPad/mobile layout consideration
- Timer is a raw number, not a visual progress indicator

---

## New Architecture

### Route & Page
- New route: `/ielts/mock-test` → `src/pages/IELTSMockTest.tsx`
- New hook: `src/hooks/useMockTest.ts` — extracted and cleaned from `useSpeakingTest`
- SpeakingStudio's speaking mode section removed (shadowing mode remains until full retirement)

### Screen Flow (5 phases)

```text
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  1. CONFIG   │───▶│ 2. COUNTDOWN │───▶│  3. TEST     │───▶│ 4. SCORING   │───▶│  5. REPORT   │
│  (setup)     │    │  (3-2-1)     │    │  (per-part)  │    │  (AI grading)│    │  (results)   │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## Phase Details

### 1. Config Screen (replaces ExaminerConfig)
- Full-screen glassmorphic card centered over teacher video
- Part selection with timing info (Part 1: 4-5 min, Part 2: 3-4 min, Part 3: 4-5 min)
- Week selector to pull Part 2 cue card from curriculum
- Accent selector (UK/US)
- Estimated total time display
- "Begin Test" CTA button

### 2. Countdown Overlay
- Full-screen 3-2-1 countdown (reuse existing `CountdownOverlay`)

### 3. Active Test (per-part phases)
- **Top bar**: Part label pill + visual countdown ring (circular progress)
- **Part 1 & 3**: Question displayed in floating panel left; mic + next-question controls right; live transcript bottom
- **Part 2 Prep**: Cue card centered (pulled from curriculum for selected week), freehand notepad, "I'm Ready" button, 60s countdown ring
- **Part 2 Speak**: Cue card shrinks to left panel, 2-min countdown ring, mic active
- **Part transitions**: Animated slide showing completed parts (checkmarks) and next part preview
- **iPad layout**: Controls scale up, touch targets 48px+, cue card/notepad stack vertically on narrower viewports

### 4. Scoring Screen
- Full-screen overlay while AI grades
- Animated loading state with progress steps: "Analyzing fluency..." → "Evaluating vocabulary..." → "Scoring grammar..." → "Generating report..."
- Uses existing `SessionFeedbackCard` AI prompt but displays results in structured UI instead of raw markdown

### 5. Report Card (replaces SessionFeedbackCard + SaveSessionModal)
- **Band score donut chart** (overall score prominently displayed)
- **4-criterion breakdown** cards: Fluency & Coherence, Lexical Resource, Grammar, Pronunciation — each with score, assessment, and 1 tip
- **Vocabulary suggestions** section
- **Transcript accordion** — expandable per-part transcript
- **Actions**: Save to History, Try Again, Download Report (generates simple text summary), Return to Dashboard
- Session saved to `mock_test_sessions` table for history

---

## New Components

| Component | Purpose |
|---|---|
| `src/pages/IELTSMockTest.tsx` | Route page, orchestrates phases |
| `src/hooks/useMockTest.ts` | Extracted test state machine from useSpeakingTest |
| `src/components/mock-test/MockTestConfig.tsx` | Phase 1: full-screen setup |
| `src/components/mock-test/MockTestActive.tsx` | Phase 3: active test UI |
| `src/components/mock-test/PartTransition.tsx` | Animated transition between parts |
| `src/components/mock-test/CountdownRing.tsx` | Circular SVG countdown timer |
| `src/components/mock-test/MockTestReport.tsx` | Phase 5: structured report card |
| `src/components/mock-test/BandScoreDonut.tsx` | SVG donut chart for band score |
| `src/components/mock-test/CriterionCard.tsx` | Individual criterion assessment card |

---

## Database

New table `mock_test_sessions`:
```sql
create table public.mock_test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz default now(),
  week_number int,
  parts_completed text[] not null,
  transcript text,
  overall_band text,
  criteria_scores jsonb,
  vocabulary_suggestions text[],
  accent text default 'uk',
  duration_seconds int
);
alter table public.mock_test_sessions enable row level security;
-- Users can read/insert their own
create policy "Users manage own sessions" on public.mock_test_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
```

---

## iPad/Mobile Optimization
- All touch targets minimum 48px
- Config screen: single column, full-width cards
- Active test: cue card and notepad stack below each other instead of side-by-side
- Controls: bottom-docked action bar instead of right-side floating on viewports < 900px wide
- Countdown ring scales responsively
- Report card: single-column scroll on narrow viewports

---

## Implementation Order (6 steps)

1. **Database**: Create `mock_test_sessions` table with RLS
2. **Hook**: Extract `useMockTest` from `useSpeakingTest`, add curriculum-based cue card loading and structured scoring
3. **Config + Countdown**: Build MockTestConfig and CountdownRing components
4. **Active Test**: Build MockTestActive with part transitions, live transcript, and responsive layout
5. **Report**: Build MockTestReport with BandScoreDonut, CriterionCard, save/download actions
6. **Route + Cleanup**: Add `/ielts/mock-test` route, link from student dashboard, remove speaking mode from SpeakingStudio

