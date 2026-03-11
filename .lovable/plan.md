

## Audit: What's Done vs. What's Still Missing

### Implemented (Steps 1-9 from the plan)
1. **Start Practice CTA** — Done in `StudentPractice.tsx`
2. **Back buttons** — Already present on all practice pages (verified: ArrowLeft + navigate in all 8 files)
3. **Course badges** — Already present on practice pages
4. **SYSTEM_PROMPT with IELTS criteria** — Done in `types/speaking.ts`, `IELTSSpeaking.tsx`, `IGCSESpeaking.tsx`
5. **Dynamic Part 2 cue cards** — Done (`SpeakingStudio.tsx` imports `getSpeakingQuestions`, falls back to `PART2_TOPIC`)
6. **SessionFeedbackCard** — Done (rendered in `SpeakingStudio.tsx` lines 550-554)
7. **WelcomeModal** — Done (file exists, rendered in `StudentPractice.tsx`)
8. **BrowserBanner** — Done (file exists, rendered in `StudentPractice.tsx`)
9. **Streak widget wired to real data** — Done (`useStreak.ts` hook exists, `RightPillar.tsx` uses it)

### NOT Yet Implemented
- **Step 10 — Loading/error state audit**: `ai.ts` still has no toast notifications on error. Practice pages haven't been audited for missing spinners.
- **Step 11 — Short-phrase karaoke layout fix**: Already present in `ProsodyVisualizer.tsx` line 10 (`data.length >= 4` conditional). This is done.

So the only remaining item is **Step 10: Add toast error handling to `ai.ts` and audit loading states across practice pages**.

### Plan for Step 10

1. **`src/services/ai.ts`** — Import `toast` and show a user-facing error toast when `sendChatMessage` fails, before re-throwing
2. **Practice pages audit** — Verify each page shows `Loader2` spinners during async operations:
   - `IELTSPronunciation.tsx` — already has `Loader2` import and usage
   - `IGCSEPronunciation.tsx` — already has `Loader2`
   - `IELTSFluency.tsx` — already has `Loader2`
   - `IGCSEFluency.tsx` — already has `Loader2`
   - `IELTSSpeaking.tsx` — already has `Loader2`
   - `IGCSESpeaking.tsx` — already has `Loader2`
   - `SpeakingStudio.tsx` — already has `Loader2`
3. **`SessionFeedbackCard.tsx`** — already shows `Loader2` spinner + has error fallback text

The only concrete code change needed is adding a toast notification to `ai.ts` on error.

