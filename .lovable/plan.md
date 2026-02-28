

## Phase 1: Upload Curriculum Files & Wire Dynamic Content

### Step 1: Create `curriculum` storage bucket (SQL migration)
- Create a public `curriculum` bucket for JSON files
- RLS policy: authenticated users can read

### Step 2: Upload curriculum files to storage
- Copy `IELTS_APP_Shadowing_chunks-2.txt` → `public/data/ielts-shadowing.json` (temporary, then upload to storage via edge function)
- Copy `IGCSE_Course_Shadowing_Chunks-2.txt` → `public/data/igcse-shadowing.json`
- Create a one-time `upload-curriculum` edge function that reads these files and uploads them to the `curriculum` bucket as `ielts-shadowing.json` and `igcse-shadowing.json`

### Step 3: Add `course_type` column to `classes` table (SQL migration)
- `ALTER TABLE classes ADD COLUMN course_type TEXT NOT NULL DEFAULT 'ielts'`
- Constrained to `'ielts'` or `'igcse'` via a validation trigger

### Step 4: Add `selected_week` column to `profiles` table (SQL migration)
- `ALTER TABLE profiles ADD COLUMN selected_week SMALLINT NOT NULL DEFAULT 1`

### Step 5: Update `TeacherDashboard.tsx` — add course type selector
- Add an IELTS/IGCSE toggle when creating a class
- Update `createClass()` in `db.ts` to accept and pass `courseType`

### Step 6: Create `src/services/curriculum-storage.ts`
- `fetchCurriculumJSON(courseType: 'ielts' | 'igcse')` — downloads and parses JSON from the `curriculum` storage bucket
- `getWeekChunks(data, weekNumber, sectionId)` — filters to a specific week and section, returns chunks array
- `getSpeakingQuestions(data, weekNumber)` — returns question texts only (no model answers)

### Step 7: Create `src/hooks/useCourseWeek.ts`
- Determines student's course type by joining `class_memberships` → `classes.course_type`
- Loads/persists `selected_week` from `profiles`
- Exposes: `courseType`, `selectedWeek`, `setSelectedWeek`, `shadowingWeek` (selectedWeek + 1, wraps at max)

### Step 8: Create `src/hooks/useShadowingCurriculum.ts`
- Fetches curriculum JSON for the student's course
- Filters to `shadowingWeek` chunks (IELTS: part_2 + part_3 sections; IGCSE: transcoded + model_answer sections)
- Flattens all chunks into a linear list
- Provides `currentChunk`, `nextChunk()`, `resetToFirst()` for infinite looping
- Tracks chunk index for display

### Step 9: Create `src/components/speaking/WeekSelector.tsx`
- Compact dropdown (1–40) showing current week
- Persists to `profiles.selected_week` on change

### Step 10: Update `SpeakingStudio.tsx`
- Integrate `useCourseWeek` for course detection and week selection
- Add `WeekSelector` to the top bar
- **Shadowing mode**: use `useShadowingCurriculum` to serve next-week chunks instead of current pronunciation curriculum; keep existing pronunciation practice type as a separate option
- **Speaking mode**: fetch current week's `question_text` values from the curriculum JSON to display as prompts (no model answers shown)
- Wire the "Next Sentence" button to `nextChunk()` which auto-loops

### Step 11: Add db helper functions to `src/services/db.ts`
- `fetchStudentCourseType(userId)` — joins class_memberships → classes to get course_type
- `fetchSelectedWeek(userId)` / `updateSelectedWeek(userId, week)`

### Data structures

**IELTS file**: weeks 1–N, sections `part_2` (3 questions with chunks) and `part_3` (6 questions with chunks)
- Shadowing uses next week's part_2 + part_3 chunks
- Speaking uses current week's `question_text` values

**IGCSE file**: weeks 1–N, sections `transcoded` (1 question with chunks) and `model_answer` (1 question with chunks)
- Shadowing uses next week's transcoded + model_answer chunks
- Speaking uses current week's `question_text` values

### What's NOT in this phase
- Smart activity timer (Phase 2)
- Student practice logs table (Phase 2)
- Student Analysis/Progress screen (Phase 2)
- Pronunciation file migration (stays in existing database-driven curriculum system)

