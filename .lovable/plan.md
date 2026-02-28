

## Plan: Restructure Shadowing Mode to Two Options (Pronunciation + Fluency)

### Current State
The left-side pill box in shadowing mode shows three buttons: **Pronunciation**, **Shadowing** (internally `curriculum`), and **Fluency**. The "Fluency" option currently uses hardcoded `FLUENCY_SENTENCES`. The "Shadowing" option uses week-based curriculum chunks (IELTS or IGCSE based on student's class).

### What Changes

**Remove the old "fluency" practice type entirely.** Rename `"curriculum"` to `"fluency"` throughout the component. The new "Fluency" button will use the existing `useShadowingCurriculum` hook, which already routes to IGCSE or IELTS chunks based on the student's `courseType`.

### Implementation Steps

1. **`src/pages/SpeakingStudio.tsx`**:
   - Change `practiceType` state type from `"pronunciation" | "fluency" | "curriculum"` to `"pronunciation" | "fluency"`
   - The new `"fluency"` type takes over all the logic currently under `"curriculum"` (shadowing chunks, next chunk, etc.)
   - Update the pill box array from `["pronunciation", "curriculum", "fluency"]` to `["pronunciation", "fluency"]`
   - Remove the `t === "curriculum" ? "Shadowing" : t` label logic — just display `t` directly
   - Update all conditional checks: `practiceType === "curriculum"` becomes `practiceType === "fluency"`
   - Remove the old fluency branch in `handleGenerate` that used `FLUENCY_SENTENCES`
   - Update `timerActivityType` derivation accordingly
   - Remove the `FLUENCY_SENTENCES` import if no longer used elsewhere

2. **`src/hooks/useCurriculum.ts`** — No changes needed (only used for pronunciation)

3. **`src/hooks/useCourseWeek.ts`** — No changes needed (already provides `courseType` for chunk routing)

### Data Routing (already working)
- **Pronunciation**: Database-driven `curriculum_items` table (unchanged)
- **Fluency**: `useShadowingCurriculum` → fetches `igcse-shadowing.json` or `ielts-shadowing.json` based on `courseWeek.courseType` (already implemented under the old "curriculum" name)

