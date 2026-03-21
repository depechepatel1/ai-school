

# Remaining `as any` Audit — Cleanup Plan

## Findings

94 occurrences across 13 files. Many are already fixed (db.ts, useStudentProgress.ts). Here are the remaining grouped by fix type:

---

### Category A: Supabase table/RPC not in generated types (5 files)
These use `as any` because the table or RPC isn't recognized by the auto-generated types. Fix: define local type overrides.

1. **`src/services/analytics.ts`** (lines 89-90) — `"user_events" as any` and `payload as any` on insert
2. **`src/components/admin/AdminEventsPanel.tsx`** (line 71) — `"user_events" as any` on select
3. **`src/hooks/useMockTest.ts`** (lines 411, 417) — `"mock_test_sessions" as any` on insert, `result.criteria as any`
4. **`src/hooks/useExtendedLeaderboard.ts`** (lines 25, 32) — `"get_extended_practice_leaderboard" as any` RPC call, `data as any[]`
5. **`src/hooks/useStudentReport.ts`** (line 93) — `lb as any[]` from leaderboard RPC result

**Fix approach**: Create a `src/types/supabase-extensions.d.ts` file that merges additional table/RPC definitions into the Database type. Alternatively, define minimal local interfaces for the query results and cast to those instead of `any`.

### Category B: Profile column not in types (1 file)
6. **`src/hooks/useAccent.ts`** (line 30) — `{ accent: newAccent } as any` because `accent` may not be in the generated profiles Update type

**Fix**: Check if `accent` exists in types.ts. If not, same extension approach as Category A.

### Category C: Browser API types (3 files — lower priority)
7. **`src/lib/stt.ts`** (line 14) — `(window as any).SpeechRecognition` — browser API not in default TS types
8. **`src/lib/stt-provider.ts`** (lines 31-32) — same pattern
9. **`src/lib/tts-provider.ts`** (lines 236, 361-362, 381-382) — `(e as any).error` on SpeechSynthesisErrorEvent

**Fix**: Add a `src/types/web-speech.d.ts` declaring `SpeechRecognition` on `Window`. For TTS errors, cast to `SpeechSynthesisErrorEvent` which has `.error`.

### Category D: Typed array cast (1 file)
10. **`src/lib/pitch-detector.ts`** (line 113) — `this.buffer as any` passed to `detectPitch`

**Fix**: Type the `detectPitch` parameter as `Float32Array` which matches `getFloatTimeDomainData` output.

### Category E: Dev-only code (1 file — lowest priority)
11. **`src/components/DevNav.tsx`** (line 134) — `role as any` for upsert — dev tool only

**Fix**: Cast to the `app_role` enum type.

### Category F: Mock test curriculum (1 file)
12. **`src/services/mock-part1-curriculum.ts`** (line 141) — `script.test_flow as any`

**Fix**: Define an interface for the test_flow JSON shape.

---

## Recommended Scope

**High priority (Categories A, B)**: 6 files, ~15 casts. These are production code paths touching the database.

**Medium priority (Category C)**: 3 files, ~8 casts. Browser API declarations.

**Low priority (D, E, F)**: 3 files, ~3 casts. Niche or dev-only.

## Implementation

### Files to create
- `src/types/web-speech.d.ts` — Window.SpeechRecognition declaration

### Files to edit
1. `src/services/analytics.ts` — type the event payload and table name
2. `src/components/admin/AdminEventsPanel.tsx` — same table fix
3. `src/hooks/useMockTest.ts` — type mock_test_sessions insert and criteria
4. `src/hooks/useExtendedLeaderboard.ts` — type RPC result
5. `src/hooks/useStudentReport.ts` — type leaderboard result
6. `src/hooks/useAccent.ts` — remove cast if `accent` is in generated types, else type override
7. `src/lib/stt.ts` — use Window declaration
8. `src/lib/stt-provider.ts` — use Window declaration
9. `src/lib/tts-provider.ts` — cast to `SpeechSynthesisErrorEvent`
10. `src/lib/pitch-detector.ts` — type `detectPitch` param as `Float32Array`
11. `src/components/DevNav.tsx` — cast to enum type
12. `src/services/mock-part1-curriculum.ts` — define test_flow interface

No logic changes. No database migrations.

