
Goal: eliminate recurring `Upload failed: 400 ... "exp" claim timestamp check failed` during long curriculum timing runs.

1) Confirmed root cause
- The worker is still sending an expired user token during incremental saves.
- Current refresh handshake asks the parent for `getSession()`, but this does not guarantee a freshly refreshed token.
- Evidence: backend auth logs show password login events but no refresh-token `/token` calls during these long runs.
- Secondary contributor: an already-open timing popup can keep running older worker code across updates.

2) Fix token refresh at the source (parent window)
- File: `src/lib/timing-worker-channel.ts`
- In `REQUEST_TOKEN_REFRESH` handling:
  - Replace “read session only” behavior with an explicit refresh-first flow:
    1. Get current session.
    2. If missing/near expiry, call `supabase.auth.refreshSession()`.
    3. Return the newest valid access token to popup.
  - If refresh fails, send an empty token + clear error signal so worker can stop with a clear “please log in again” message.
- Keep the existing message channel contract, but add stronger logging around refresh success/failure.

3) Make worker expiry-aware and strict about stale tokens
- File: `public/timing-worker.html`
- Add JWT-exp parsing helper (`exp` claim) and track token expiry timestamp.
- Update `ensureFreshToken()` to refresh based on actual token expiry window (e.g., <2 minutes left), not only elapsed wall-clock time.
- In `requestTokenRefresh()`, reject/flag if returned token is empty or still expired.
- In upload retry logic:
  - Keep auth-failure detection for `400/401/403`.
  - Parse error body for auth-expiry signals (`exp claim`, `Unauthorized`) before deciding refresh path.
  - If refresh returns invalid token, fail fast with actionable error (instead of repeated failing retries).

4) Ensure new runs always use latest worker code
- File: `src/lib/timing-worker-channel.ts`
- In popup lifecycle, force reload of existing popup to `/timing-worker.html?t=...` before starting a new queue/job (when not actively running).
- This prevents stale popup scripts from preserving pre-fix logic across deployments.

5) Validation plan
- Run “Time IELTS Fluency” end-to-end past the prior failure region (70+ batches).
- Confirm worker log now shows refresh events and no repeated `exp claim timestamp check failed`.
- Confirm incremental saves continue after 60+ minutes.
- Verify auth analytics now include refresh-token activity during long jobs.
- Regression check: cancel/resume partial still works, final upload still succeeds.

Technical details
- Files to update:
  - `src/lib/timing-worker-channel.ts`
  - `public/timing-worker.html`
- No database schema, policies, or backend function changes required.
- Voice “interrupted/timeout_after_start” warnings are expected fallback behavior and separate from JWT expiry; they should not block saves once token flow is fixed.
