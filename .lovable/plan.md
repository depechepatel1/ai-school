

## Plan: Show Question Context Above Shadowing Karaoke Text

### Problem
In Fluency mode, chunks are flattened from their parent questions, so students don't know what question the shadowing sentence answers.

### Changes

**1. `src/services/curriculum-storage.ts`** — Update `getWeekShadowingChunks` to return enriched chunks that include the parent `question_text`:
- Define a new type `CurriculumChunkWithQuestion` extending `CurriculumChunk` with a `question_text: string` field
- Modify `getWeekShadowingChunks` to return `CurriculumChunkWithQuestion[]`, attaching each question's `question_text` to its child chunks

**2. `src/hooks/useShadowingCurriculum.ts`** — Expose the current chunk's question text:
- Update types to use `CurriculumChunkWithQuestion`
- Add `currentQuestionText` to the return object, derived from `currentChunk?.question_text`

**3. `src/pages/SpeakingStudio.tsx`** — Display question above karaoke text:
- In the fluency shadowing bottom panel (around line 332), add a discrete line of text above the `ProsodyVisualizer` showing `shadowCurriculum.currentQuestionText`
- Style: small italic text, low opacity (e.g., `text-[11px] italic text-white/40`), max-width constrained, centered

### Data Flow
```text
JSON: question.question_text → question.chunks[]
  ↓
getWeekShadowingChunks: attaches question_text to each chunk
  ↓
useShadowingCurriculum: exposes currentQuestionText
  ↓
SpeakingStudio: renders above karaoke visualizer
```

