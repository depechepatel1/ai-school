

## Refactoring Roadmap: SpeakingStudio Monolith Deconstruction

### Current State Assessment

The primary monolith is **`src/pages/SpeakingStudio.tsx` (1,783 lines)**. It contains:
- 8 inline UI components (canvas visualizers, widgets, modals, config panels)
- Complex IELTS test state machine logic
- Curriculum loading/progression logic
- Audio recording/playback management
- AI chat orchestration
- All wired together with 30+ `useState` calls

Other pages (`StudentPractice`, `TeacherDashboard`, `ParentDashboard`) are already well-structured and reasonably sized. The student components under `/components/student/` are properly decomposed. The `/services/db.ts` and `/services/ai.ts` layers are solid.

---

### Phase 1: Types Extraction

Create **`src/types/speaking.ts`** — extract all interfaces and type aliases from SpeakingStudio:
- `CurriculumItem`, `Persona`, `TestPart`, `TestStatus`, `TestState`
- `PART2_TOPIC` type and constant
- `SYSTEM_PROMPT`, `FALLBACK_SENTENCES`, `FLUENCY_SENTENCES` constants

---

### Phase 2: Extract Inline Components to `/components/speaking/`

Create individual files for each inline component currently embedded in `SpeakingStudio.tsx`:

| New File | Source Component | Lines |
|---|---|---|
| `components/speaking/TargetContourCanvas.tsx` | `TargetContourCanvas` | ~155 lines |
| `components/speaking/LiveInputCanvas.tsx` | `LiveInputCanvas` | ~160 lines |
| `components/speaking/DebugContourOverlay.tsx` | `DebugContourOverlay` | ~95 lines |
| `components/speaking/ProsodyVisualizer.tsx` | `ProsodyVisualizer` | ~50 lines |
| `components/speaking/XPWidget.tsx` | `XPWidget` | ~20 lines |
| `components/speaking/StreakWidget.tsx` | `StreakWidget` | ~15 lines |
| `components/speaking/CountdownOverlay.tsx` | `CountdownOverlay` | ~10 lines |
| `components/speaking/PersonaSelector.tsx` | `PersonaSelector` | ~50 lines |
| `components/speaking/ExaminerConfig.tsx` | `ExaminerConfig` | ~55 lines |
| `components/speaking/CueCard.tsx` | `CueCard` | ~15 lines |
| `components/speaking/FreehandNotePad.tsx` | `FreehandNotePad` | ~50 lines |
| `components/speaking/SaveSessionModal.tsx` | `SaveSessionModal` | ~35 lines |
| `components/speaking/FlagIcons.tsx` | `UKFlag`, `USFlag` | ~20 lines |

---

### Phase 3: Extract Custom Hooks to `/hooks/`

Move business logic out of the main component into dedicated hooks:

| New File | Responsibility |
|---|---|
| `hooks/useSpeakingTest.ts` | Full IELTS test state machine: `testState`, `advanceTest`, `stopTestManual`, `finishTest`, `initiateCountdown`, `runTestSetup`, countdown logic, timer effects |
| `hooks/useCurriculum.ts` | Curriculum loading, pagination, progress save/resume: `loadCurriculumPage`, `handleNextSentence`, progress persistence |
| `hooks/useAudioCapture.ts` | MediaRecorder management, replay audio state, mic permissions |
| `hooks/useXP.ts` | XP/level state and `addXP` function (already simple, but isolates gamification) |

---

### Phase 4: Verify Data Layer Completeness

The existing `services/db.ts` already centralizes all database calls. Verify and ensure:
- No direct `supabase` imports exist outside `services/db.ts` and `services/ai.ts` (besides `lib/auth.tsx`)
- Teacher and Parent dashboards use the same `services/db.ts` functions
- No data-fetching logic lives inside page components (currently `TeacherDashboard` correctly uses `fetchClasses` from `db.ts`)

---

### Phase 5: Final SpeakingStudio Page

After extraction, `SpeakingStudio.tsx` becomes a ~300-line orchestrator that:
- Imports all components from `components/speaking/`
- Uses hooks for test logic, curriculum, and audio
- Contains only layout JSX and minimal glue code

---

### Dependency Safety Plan

Before each file split:
1. All props interfaces defined in `types/speaking.ts` first
2. Components receive data via props only (no internal `supabase` calls)
3. Hooks return typed objects matching the interfaces
4. No circular imports — hooks import from `types/` and `services/`, components import from `types/` only

### Files NOT Modified

- `services/db.ts` — already clean, universal data layer
- `services/ai.ts` — already clean
- `lib/contour-match.ts` — already extracted
- `lib/prosody.ts` — already extracted
- `lib/speech-analysis-provider.ts` — already extracted
- `lib/provider-config.ts` — already clean
- All `/components/student/` files — already decomposed
- All `/components/ui/` files — shadcn, untouched

