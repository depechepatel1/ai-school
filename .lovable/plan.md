

# Batch 7: Error Handling & Resilience

## What
Five targeted fixes adding missing error handling, XSS prevention, timeout recovery, and proper loading states.

## Changes

### 1. `src/components/OmniChatModal.tsx` — Toast error + XSS sanitization
- The try-catch already exists (lines 140-173) and already shows an inline error message. **Upgrade**: also fire a toast via `useToast` so the error is visible even if the chat scrolls.
- Add `dompurify` dependency. Sanitize `m.content` before passing to `<ReactMarkdown>` for assistant messages. Apply same sanitization in the empty-state greeting (static string, but consistent pattern).

### 2. `src/lib/chat-stream.ts` — JSON parse resilience (line 67-70)
- Currently on parse failure: puts partial line back in buffer and `break`s the inner loop, which can stall the stream if the chunk is genuinely malformed (not just incomplete).
- Fix: add `console.warn("[chat-stream] JSON parse failed:", json)` and `continue` instead of `break`. Remove the buffer-restore line — a truly malformed SSE line should be skipped, not re-processed.

### 3. `src/pages/Index.tsx` — 5-second role timeout
- Add a second `useEffect` with a `setTimeout(5000)`. If `!loading && user && !role` persists after 5s, show a toast "Session expired. Please log in again." and navigate to `/login`.
- Clean up timeout on unmount or when role arrives.

### 4. `src/services/analytics.ts` — Catch unhandled rejection (line 87-92)
- The `.then()` chain has no `.catch()`. Add `.catch((err) => console.error("[analytics] Unhandled insert error:", eventName, err))` after the `.then()`.

### 5. `src/hooks/useTimerSettings.ts` — Already exports `loading`
- The hook already returns `{ countdownMinutes, loading }`. The request asks to rename it to `isLoading` for clarity. Rename the returned key from `loading` to `isLoading` and update any consumers.

## Dependencies
- Add `dompurify` and `@types/dompurify` packages.

## Files touched
- `src/components/OmniChatModal.tsx`
- `src/lib/chat-stream.ts`
- `src/pages/Index.tsx`
- `src/services/analytics.ts`
- `src/hooks/useTimerSettings.ts`
- `package.json` (new dep: dompurify)

No database migrations needed.

