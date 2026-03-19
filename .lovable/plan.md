

## Upload and Use IELTS Part 1 Examiner Script

### What this does

Stores the Part 1 question bank JSON in the `curriculums` storage bucket, makes it manageable from the admin curriculum panel, and rewires the mock test's Part 1 flow to follow the scripted examiner sequence instead of free-form AI questions.

### Examiner sequence (from the JSON)

1. **Introduction** (not timed): Greet → ask name → ask where from → transition phrase
2. **Opening Frame** (timed, ~3 questions): Randomly pick one R1 variant (hometown) OR one R2 variant (work/study). For students, always use `study_questions` from R2.
3. **Topic Frames** (timed, 3-4 questions each): Randomly pick 2 topic frames from the 56-item pool. Say the intro phrase, then ask questions sequentially.

The AI examiner reads these scripted questions aloud via TTS. It does NOT generate its own Part 1 questions. The AI is still used for Part 3 discussion and for final scoring.

---

### Changes

**1. Add "Mock Test Part 1" module option to admin curriculum panel**

- **`src/components/admin/curriculum-helpers.ts`**: Add a new entry to `MODULE_OPTIONS`:
  ```
  { value: "mock-part1", label: "Mock Test Part 1", path: "mock-part1-questions.json" }
  ```
  Update `getFilePath` so `mock-part1` maps to `ielts/mock-part1-questions.json`. No timing file needed for this module.

- **`src/components/admin/AdminCurriculumUpload.tsx`**: The existing upload flow already handles arbitrary JSON files — no changes needed beyond the new module option appearing in the dropdown.

**2. Upload the initial JSON file to storage**

- Copy the uploaded file into the project so it can be uploaded via the admin panel, OR write a migration/seed that uploads it directly to the `curriculums` bucket at path `ielts/mock-part1-questions.json`.
- Insert a `curriculum_metadata` row: `course_type='ielts'`, `module_type='mock-part1'`, `file_path='ielts/mock-part1-questions.json'`, `version=1`, `is_active=true`.

**3. Create a service to fetch and parse the Part 1 script**

- **New file: `src/services/mock-part1-curriculum.ts`**
  - `fetchPart1Script()`: Queries `curriculum_metadata` for active `mock-part1` / `ielts`, fetches the JSON from the `curriculums` bucket (with cache-busting), returns the parsed structure.
  - `buildPart1Sequence(script)`: Implements the selection logic:
    - Randomly pick R1 or R2 opening frame. If R2 and user is student, use `study_questions`.
    - Randomly pick 2 topic frames from the pool.
    - Returns an ordered array of `{ intro: string, questions: string[] }` segments plus the introduction script lines.

**4. Rewire `useMockTest.ts` Part 1 flow to use scripted questions**

- On `startTest`, call `fetchPart1Script()` and `buildPart1Sequence()`. Store the result in a ref (`part1ScriptRef`).
- Track a `part1QuestionIndex` ref that advances through the scripted questions.
- Replace `triggerAIQuestion()` calls during Part 1 with a new `speakNextPart1Question()` function that:
  - Reads the next question from the pre-built sequence
  - Adds it to `messages` as a `teacher` message
  - Speaks it via TTS
  - When the sequence is exhausted, transitions to the boundary pause
- The introduction script lines are spoken sequentially at the start of Part 1 (before the timer begins or as the first timed segment).
- `handleNextQuestion` during Part 1 calls `speakNextPart1Question()` instead of `triggerAIQuestion()`.
- Parts 2 and 3 continue using `triggerAIQuestion()` as before.

**5. Handle `{country}` and `{examiner_name}` placeholders**

- Replace `{examiner_name}` with "Teacher Li" (or the configured persona name).
- Replace `{country}` with the student's country from their profile, or default to "your country" if not set.

---

### No database schema changes

The existing `curriculum_metadata` table and `curriculums` bucket handle this. One metadata row insert via migration is needed.

### Technical details

- The Part 1 script fetch happens once at test start (during the countdown phase) so there's no delay when Part 1 begins.
- The question sequence is deterministic per test session (randomized once at build time), ensuring the examiner doesn't repeat or skip questions mid-test.
- Admin can re-upload the JSON at any time from the curriculum panel; the next mock test will pick up the new version automatically.

