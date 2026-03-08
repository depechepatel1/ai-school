

## Diagnosis: Schema Mismatch Between Uploaded and Expected Curriculum Format

### Root Cause

The IELTS curriculum JSON uploaded to the `curriculums` bucket uses a **raw lesson format**:
```json
{ "week": 1, "lesson_1_part_2": { "q1": { "html": "..." } }, "lesson_2_part_3": { ... } }
```

But the app's fetch pipeline (`fetchCurriculumJSON` → `getWeekShadowingChunks` / `getSpeakingQuestions`) expects the **normalized format**:
```json
{ "week_number": 1, "sections": [{ "section_id": "part_2", "questions": [{ "question_text": "...", "chunks": [...] }] }] }
```

The local fallback file (`public/data/ielts-shadowing.json`) has the correct format, but it's never reached because the metadata query finds an active row pointing to the bucket file, which gets fetched successfully — just with the wrong schema. All downstream functions then silently return empty arrays.

### Fix: Add a Normalization Layer in `fetchCurriculumJSON`

**File: `src/services/curriculum-storage.ts`** — add a `normalizeIELTSCurriculum()` function that detects the raw format (has `week` instead of `week_number`, has `lesson_1_part_2` keys) and transforms it:

1. **Detect raw format**: Check if first element has `week` key instead of `week_number`
2. **Extract question text**: Split `html` content — first sentence/paragraph before the answer body is the question prompt
3. **Strip HTML + Chinese annotations**: Remove `<span>`, `<strong>` tags and `(中文...)` parentheticals from answer text
4. **Auto-chunk answer text**: Split into 8-12 word chunks at natural boundaries (reuse existing chunking logic from `csv-to-curriculum.ts`)
5. **Map structure**:
   - `lesson_1_part_2` → section `part_2`
   - `lesson_2_part_3` → section `part_3`
   - Each `q1`, `q2`, etc. → a question with chunked answer

Call `normalizeCurriculum()` right after parsing JSON in `fetchCurriculumJSON`, before caching.

**File: `src/services/csv-to-curriculum.ts`** — export the `stripHTML` and `chunkText` utilities so they can be reused by the normalizer.

### Changes Summary

| File | Change |
|---|---|
| `src/services/csv-to-curriculum.ts` | Export `stripHTML()` and `chunkText()` as named exports |
| `src/services/curriculum-storage.ts` | Add `normalizeRawCurriculum()` that transforms raw IELTS JSON into the expected `CurriculumData` format; call it after JSON parse in `fetchCurriculumJSON` |

No database or bucket changes needed — the uploaded file stays as-is. The normalization happens client-side at fetch time.

