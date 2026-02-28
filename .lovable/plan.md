

## Understanding the Current Logic

**Week offset**: `selectedWeek + 1` is used for shadowing. So when Week 1 is selected, the app fetches Week **2** from the JSON.

**IGCSE Week 2 JSON** has two sections: `transcoded` (1 question) and `model_answer` (1 question). All chunks from both sections are flattened into a single list. The current UI shows the `selectedWeek` (1) in the WeekSelector but the content actually comes from Week 2.

**IELTS Week 2 JSON** has two sections: `part_2` (3 questions) and `part_3` (multiple questions). Same flattening.

**The problem**: The WeekSelector just says "Week 1" but the content is from Week 2's sections. There's no indication of which section (Transcoded vs Model Answer, or Part 2 vs Part 3) or which question the current chunk belongs to.

---

## Proposed Label Logic

### Data changes needed

Extend `CurriculumChunkWithQuestion` to carry `section_id` and `question_id` alongside each chunk. The `getWeekShadowingChunks` function already iterates over sections and questions — it just needs to tag each chunk with this metadata.

### Display format in the pill box

**IGCSE** (selectedWeek = 1, shadowingWeek = 2):
- `Week 1 HW · Wk 2 Model Answer · Q1`
- `Week 1 HW · Wk 2 Transcoded · Q1`

**IELTS** (selectedWeek = 1, shadowingWeek = 2):
- `Week 1 HW · Wk 2 Part 2 · Q1`
- `Week 1 HW · Wk 2 Part 2 · Q2`
- `Week 1 HW · Wk 2 Part 3 · Q1`

The pill box replaces the current plain "Week [n]" selector with a richer contextual label that updates as the user progresses through chunks.

### Section ID → Display Name Map

| `section_id` | `courseType` | Display |
|---|---|---|
| `model_answer` | igcse | Model Answer |
| `transcoded` | igcse | Transcoded Text |
| `part_2` | ielts | Part 2 |
| `part_3` | ielts | Part 3 |

---

## Implementation Steps

### 1. Extend chunk type and `getWeekShadowingChunks` (`src/services/curriculum-storage.ts`)

Add `section_id` and `question_id` to `CurriculumChunkWithQuestion`. In the flattening loop, spread these fields onto each chunk alongside `question_text`.

### 2. Expose metadata from `useShadowingCurriculum` hook

Return `currentSectionId` and `currentQuestionId` from the current chunk so the UI can read them.

### 3. Update WeekSelector to accept and display context label (`src/components/speaking/WeekSelector.tsx`)

Add an optional `contextLabel` prop (e.g. `"Wk 2 Model Answer · Q1"`). When present, display it after the week dropdown. The week dropdown still controls `selectedWeek` (the homework week).

### 4. Build the context label in `SpeakingStudio.tsx`

Using `courseWeek.selectedWeek`, `courseWeek.shadowingWeek`, the current chunk's `section_id`, and `question_id`, construct the label string:

```
`Week ${selectedWeek} HW · Wk ${shadowingWeek} ${sectionLabel} · ${questionId.toUpperCase()}`
```

Pass it to `WeekSelector` as `contextLabel`.

### Files Modified

| File | Change |
|---|---|
| `src/services/curriculum-storage.ts` | Add `section_id`, `question_id` to chunk type and flattening |
| `src/hooks/useShadowingCurriculum.ts` | Expose `currentSectionId`, `currentQuestionId` |
| `src/components/speaking/WeekSelector.tsx` | Accept and render `contextLabel` prop |
| `src/pages/SpeakingStudio.tsx` | Build context label string and pass to WeekSelector |

