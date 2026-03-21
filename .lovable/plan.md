

# Batch 6: State Management — Race Conditions & Memory Leaks

## What
Five targeted fixes to prevent race conditions, duplicate intervals, audio context leaks, uncancelled fetches, and save collisions across hooks and components.

## Changes

### 1. `src/hooks/useMockTest.ts` — Race condition fix
- Add `transitionLockRef = useRef(false)` 
- In `beginPart`: early-return if lock is true, set true at start, reset to false after state updates complete
- Prevents double-fire of the `transition_to_speak` → `beginPart("part2_speak")` path (line ~289-293 effect + skipPrep both calling beginPart)

### 2. `src/hooks/usePracticeTimer.ts` — Duplicate interval fix
- In the periodic save `useEffect` (line ~119), clear existing interval before creating a new one:
  ```
  if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
  ```
- Prevents stacked intervals when `isRunning` toggles rapidly

### 3. `src/components/speaking/MicRecordButton.tsx` — Audio context leak
- Move `ctxRef` to persist across renders (already a ref, but gets recreated each time `isActive` toggles)
- Only create a new AudioContext if `ctxRef.current` is null or its state is `"closed"`
- On cleanup: close context AND set ref to null
- Prevents hitting browser AudioContext limits on rapid mic toggling

### 4. `src/hooks/useSpeakingTest.ts` — Abort controller for AI calls
- Add `abortControllerRef = useRef<AbortController | null>(null)`
- In `triggerAIQuestion`: abort previous controller, create new one, pass signal to `chat()` call
- In unmount cleanup: call `abortControllerRef.current?.abort()`
- Note: will need to check if `chat()` in `src/services/ai.ts` supports an AbortSignal — if not, wrap the promise with signal check

### 5. `src/hooks/useStudentProgress.ts` — Save race condition
- Add `savingRef = useRef(false)` and `pendingRef = useRef<ProgressPosition | null>(null)`
- In `savePosition`: if currently saving, store in pendingRef and return
- Set savingRef true before DB call, false after
- After completion, check pendingRef — if non-null, execute the queued save

## Files touched
- `src/hooks/useMockTest.ts`
- `src/hooks/usePracticeTimer.ts`
- `src/components/speaking/MicRecordButton.tsx`
- `src/hooks/useSpeakingTest.ts`
- `src/hooks/useStudentProgress.ts`

No other files changed. No database migrations.

