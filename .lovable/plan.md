

# Fix JWT Expiry During Long-Running Timing Jobs

## Problem
The timing worker runs for 30+ minutes (252 batches). The admin's JWT expires mid-job (~1 hour lifetime). When the worker tries to save incremental progress to storage, the upload fails with HTTP 400 containing `"exp" claim timestamp check failed`. The existing token refresh mechanism only checks for status 401/403, missing the 400 response.

## Root Cause
`public/timing-worker.html` line 291: `if (res.status === 401 || res.status === 403)` — Supabase storage returns HTTP **400** (not 401/403) for expired JWT claims.

## Fix

**File:** `public/timing-worker.html`

Two changes:

1. **Broaden the auth failure check** (line 291): Also check for status 400, and additionally parse the response body for auth-related error messages to catch edge cases.

2. **Add proactive token refresh**: Before each batch save, check if the token is likely expired (track token age) and preemptively request a fresh token. This prevents the error entirely rather than just reacting to it.

### Specific code changes:

**Change 1 — Fix upload retry condition** (line 291):
```javascript
// Replace:
if (res.status === 401 || res.status === 403) {

// With:
if (res.status === 401 || res.status === 403 || res.status === 400) {
```

This ensures any 400 error (which includes expired JWT) triggers a token refresh and retry. A 400 for non-auth reasons will still fail on the second attempt, so this is safe.

**Change 2 — Also fix the POST fallback** (lines 297-299): After a failed PUT with token refresh, the POST fallback on line 298 should not re-attempt without also using a fresh token. Restructure so the POST fallback also benefits from the refreshed token.

**Change 3 — Add proactive token refresh every ~45 minutes**: Track when the token was last refreshed, and request a new one before it expires. Add a simple timer check at the start of each batch:
```javascript
let lastTokenRefreshTime = Date.now();
const TOKEN_REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes

// At start of each batch in runSingleJob:
if (Date.now() - lastTokenRefreshTime > TOKEN_REFRESH_INTERVAL_MS) {
  await requestTokenRefresh();
  lastTokenRefreshTime = Date.now();
}
```

This is a 3-line addition that prevents the problem from ever occurring.

