

## Implementation Plan: UX + Pedagogical Improvements (Pronunciation Scoring Deferred)

### Context
The user confirmed that pronunciation scoring will come from Aliyun DashScope API later. Steps 7 and 8 from the original roadmap (pronunciation feedback card, per-word highlighting) are **deferred**. The existing `analyzeContour` / `speech-analysis-provider.ts` infrastructure stays in place as a placeholder — it already has the Aliyun provider stub ready.

### Remaining steps, in order:

---

**Step 1 — Add "Start Practice" CTA to Student Dashboard**
- File: `src/pages/StudentPractice.tsx`
- Add a prominent centered button/card that navigates to `/speaking`
- Position it in the center of the screen, above BottomDock
- Uses `useNavigate` + a styled button with Play icon

**Step 2 — Add consistent Back buttons on all practice screens**
- Files: `StudentAnalysis.tsx`, `StudentProfile.tsx`, `IELTSSpeaking.tsx`, `IGCSEPronunciation.tsx`, `IGCSEFluency.tsx`, `IGCSESpeaking.tsx`
- Copy the exact back button pattern from `SpeakingStudio.tsx` (line 245-247)
- `IELTSPronunciation.tsx` and `IELTSFluency.tsx` already have back buttons — verify and skip if present

**Step 3 — Add course badge to all 6 practice pages**
- Same files as Step 2 — add the course type badge next to the back button (pattern from SpeakingStudio line 248-252)

**Step 4 — Update SYSTEM_PROMPT with IELTS criteria**
- File: `src/types/speaking.ts`
- Rewrite `SYSTEM_PROMPT` to instruct the AI to:
  - Reference the 4 IELTS criteria explicitly
  - After Part 3, provide a brief estimated band score with one tip per criterion
  - Include vocabulary suggestions in responses
- No other files change — all consumers already import this constant

**Step 5 — Dynamic Part 2 cue cards**
- File: `src/types/speaking.ts` — export `PART2_TOPIC` type alongside default
- File: `src/pages/SpeakingStudio.tsx` — use `speakingQuestions` data for Part 2 topic when available, fall back to hardcoded default

**Step 6 — Post-session feedback card**
- New file: `src/components/speaking/SessionFeedbackCard.tsx`
- Shows after test completes: parts completed count, AI-generated summary feedback
- File: `src/pages/SpeakingStudio.tsx` — render alongside `SaveSessionModal`
- Uses existing `sendChatMessage` to get a summary from the AI with the full transcript

**Step 7 — First-use welcome modal**
- New file: `src/components/student/WelcomeModal.tsx`
- Shown once per user (localStorage `welcome_shown`)
- Explains 3 modes: Pronunciation → Fluency → Speaking, recommends practice order
- File: `src/pages/StudentPractice.tsx` — render on first visit

**Step 8 — Edge browser recommendation banner**
- New file: `src/components/student/BrowserBanner.tsx`
- Detects non-Edge browser via `navigator.userAgent`
- Dismissible banner stored in localStorage
- File: `src/pages/StudentPractice.tsx` — render at top

**Step 9 — Wire streak widget to real data**
- New hook: `src/hooks/useStreak.ts` — queries `practice_time_log` for consecutive practice days
- File: `src/components/student/RightPillar.tsx` — replace hardcoded "12 Day Streak" with real data
- No new tables needed — uses existing `practice_time_log`

**Step 10 — Loading/error state audit**
- All practice pages: ensure async actions show spinners
- `src/services/ai.ts`: add toast on network errors
- Verify all curriculum loading states show `Loader2`

**Step 11 — Short-phrase karaoke layout fix**
- File: `src/components/speaking/ProsodyVisualizer.tsx`
- Already implemented in current code (line with `data.length >= 4`). Verify it's present; if reverted, re-apply.

### Aliyun DashScope compatibility note
The `speech-analysis-provider.ts` already has the `AliyunSpeechAnalysis` class stub and the `PROVIDERS.speechAnalysis` flag in `provider-config.ts`. When Aliyun is ready:
1. Implement the `AliyunSpeechAnalysis.analyze()` method (encode audio → POST to edge function → parse response)
2. Create edge function `aliyun-speech-analysis` to proxy to DashScope
3. Flip `PROVIDERS.speechAnalysis` to `"aliyun"`
4. Then build Steps 7-8 from original plan (feedback card + per-word highlighting) using the richer Aliyun word-level scores

No current changes will conflict with this future upgrade.

