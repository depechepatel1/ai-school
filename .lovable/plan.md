

# Phase 1: Critical Bugs & Runtime Errors

Four targeted fixes for runtime bugs across the codebase.

## Fix 1 — Timing worker race condition

**Problem**: `ensurePopup()` sends START before the popup registers its BroadcastChannel listener. The popup only broadcasts READY once (line 292), which may fire before the parent is listening.

**Changes**:
- **`public/timing-worker.html`** (lines 291-294): Replace single READY broadcast with a 500ms interval that clears when a START/START_QUEUE message arrives.
- **`src/lib/timing-worker-channel.ts`** (`ensurePopup` + `sendWithAck`): Make `ensurePopup` synchronous (keep as-is), but inside `sendWithAck`, wait for READY before sending the first payload. The existing retry loop at 600ms already handles this partially — the real fix is the popup broadcasting READY repeatedly so the parent's listener catches it.

## Fix 2 — Unsafe JSON.parse in useMockTest.ts

**Problem**: Line 382 does `JSON.parse(res.content)` — already wrapped in try-catch (line 389), but the catch block is silent. Add a console.error with a meaningful message.

**Changes**:
- **`src/hooks/useMockTest.ts`** (line 389): Add `console.error("[MockTest] AI returned invalid JSON:", res.content);` and a toast notification inside the catch block so the user gets feedback.

## Fix 3 — STT infinite restart loop

**Problem**: In `stt-provider.ts` lines 65-76, `recognition.onend` auto-restarts after 500ms with no retry limit. If `start()` throws repeatedly, this loops forever.

**Changes**:
- **`src/lib/stt-provider.ts`**: Add a `retryCount` variable (max 3). Increment on each restart attempt, reset to 0 inside `onresult` on successful recognition. After 3 failures, call `callbacks.onError?.("max-retries")` and `callbacks.onEnd?.()` instead of restarting.

## Fix 4 — Empty array crash in StudentAnalysis.tsx

**Problem**: Line 322 does `Math.max(...entries.map(…), 1)` — spreading an empty array into Math.max returns -Infinity.

**Changes**:
- **`src/pages/StudentAnalysis.tsx`** (line 322): Guard with `entries.length === 0 ? 1 : Math.max(...entries.map(…), 1)`.

---

## Files to edit

| File | Fix |
|------|-----|
| `public/timing-worker.html` | Repeated READY broadcast |
| `src/lib/timing-worker-channel.ts` | No change needed (retry loop already handles delayed READY) |
| `src/hooks/useMockTest.ts` | Better error logging in JSON.parse catch |
| `src/lib/stt-provider.ts` | Retry counter (max 3) |
| `src/pages/StudentAnalysis.tsx` | Empty array guard |

