

## Plan: Speaking Screen Improvements

### Problem Summary

1. **ExaminerConfig ("Choose Test Setup")** shows for all students — should only appear for IELTS students.
2. **Question box** displays the full concatenated question text (e.g., "What activities...? Do you prefer...? Have your hobbies changed...?"). Only the **first question** (before the first `?`) should be displayed — the rest are peer follow-up questions.
3. **No homework context** — the speaking screen doesn't tell students what they're supposed to be doing in the speaking module. The homework tasks differ by course type.

### Changes

#### 1. Hide ExaminerConfig for IGCSE (`SpeakingStudio.tsx`)

The ExaminerConfig render at line 525 and the "Speaking" tab click at line 267 both trigger `setShowTestConfig(true)`. Gate both on `courseWeek.courseType === "ielts"`:
- Line 267: Only call `test.setShowTestConfig(true)` if IELTS.
- Line 525: Only render `<ExaminerConfig>` if `courseWeek.courseType === "ielts"`.

For IGCSE students clicking "Speaking", they go straight into speaking mode without the test config panel.

#### 2. Show only the first question (`SpeakingStudio.tsx`)

Line 463 currently renders `{speakingQuestions[currentQuestionIndex]}`. Change to split by `?` and take only the first part + `?`:

```tsx
{speakingQuestions[currentQuestionIndex]?.split("?")[0]}?
```

This matches the same pattern already used in the fluency mode question display (line 342).

#### 3. Add section/week context to the question box header

The header at line 456-458 currently says `Week {selectedWeek} — Question {n}/{total}`. Enhance it to also identify which section the question comes from. To do this:

**Modify `getSpeakingQuestions`** in `curriculum-storage.ts` to return objects with `{ text, sectionId }` instead of plain strings, so the UI knows which section each question belongs to.

**Update the question box header** to show:
- IGCSE: `"Week {selectedWeek} Speaking · Section 6 · Q{n}"`
- IELTS: `"Week {selectedWeek} Speaking · Part 2 · Q{n}"` / `"Part 3 · Q{n}"`

#### 4. Add homework task instructions panel (`SpeakingStudio.tsx`)

Add a collapsible info box below the question box (or as a small icon-triggered popover) showing the relevant homework instructions for the current course type. This tells students exactly what they need to do.

**IGCSE instructions:**
- Pre-HW: "Shadow Week {shadowingWeek} Model Answers (10 min)"
- Post-HW: "Record 2-min audio answering this week's question. Use 1 complex sentence + Present Perfect."

**IELTS instructions:**
- Part 1: "Shadow read all model answers for next week (10 min) + Tongue Twisters (5 min)"
- Part 2: "Record answers for all 3 Part 2 questions (3 × 2 min)"
- Part 3: "Record answers for all Part 3 questions (6 × 1 min)"

This will be a small `HomeworkInstructions` component rendered when `test.testState.status === "idle"`, positioned below the question box.

### Files Modified

| File | Change |
|---|---|
| `src/pages/SpeakingStudio.tsx` | Gate ExaminerConfig on IELTS; truncate question to first `?`; add homework instructions panel; update question header with section context |
| `src/services/curriculum-storage.ts` | Update `getSpeakingQuestions` to return `{ text, sectionId }` objects |
| `src/components/speaking/HomeworkInstructions.tsx` | New component: collapsible panel showing course-specific homework tasks |

