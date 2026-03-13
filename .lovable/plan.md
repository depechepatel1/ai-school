

## Plan: Unify FluencyPractice button cluster to match PronunciationPractice

### Reference (PronunciationPractice — the target design)
The right-side button stack has 6 buttons in this order:
1. **ChevronLeft** (Previous) — `w-10 h-10`
2. **Headphones** (Hear Model) — `w-12 h-12`, cyan active state
3. **MicRecordButton** — `size="lg"`, standardized 3-state component
4. **Play** (Replay) — `w-12 h-12`, emerald active state, disabled when no recording
5. **RotateCcw** (Repeat/Reset) — `w-10 h-10`
6. **ChevronRight** (Next) — `w-10 h-10`

### Changes needed

**`src/components/practice/FluencyPractice.tsx`** — Replace the button cluster (lines 172-186):

- **Add missing imports**: `ChevronLeft`, `RotateCcw`, `ChevronRight` from lucide-react; `MicRecordButton` from speaking components. Remove `Mic` import if no longer used elsewhere.
- **Replace inline mic button** with `<MicRecordButton>` component (matching pronunciation screen's usage with `size="lg" shape="rounded"`)
- **Add Previous button** (ChevronLeft) — wire to a `handlePrevChunk` navigation function (decrement index, wrap around)
- **Add Repeat button** (RotateCcw) — clears recording and resets state for current chunk
- **Rename SkipForward** to ChevronRight for visual consistency with Pronunciation screen
- **Match exact class strings** from PronunciationPractice for each button

The button order will become: ChevronLeft → Headphones → MicRecordButton → Play → RotateCcw → ChevronRight

### Handler additions in FluencyPractice

- `handlePrevChunk`: Navigate to previous chunk (mirror of existing `handleNextChunk` but decrementing)
- `handleRepeat`: Clear recording and reset active word index for current chunk
- Update `handleRecord` to work with MicRecordButton's `onToggle` pattern (using `startMediaRecorder`/`stopMediaRecorder` from `useAudioCapture`)

### No other files change
SpeakingStudio is excluded per user instruction (will be removed later). The IELTS/IGCSE page wrappers just render these shared components, so updating FluencyPractice covers all 4 practice screens (IELTS Fluency, IGCSE Fluency, IELTS Pronunciation, IGCSE Pronunciation).

