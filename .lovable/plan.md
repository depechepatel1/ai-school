
Goal: Make auth screens and IELTS mock test setup use identical video framing, and shift that shared framing 20% further left in one controlled change.

Why this kept failing (root cause):
- There are two competing positioning systems:
  1) inline `objectPosition` style (highest priority)
  2) `.auth-video-scale` CSS class (`object-position`)
- Inline style wins, so class-based tweaks were often ignored.
- Current mismatch is explicit in code:
  - Auth pages: `PageShell` default non-fullWidth `objectPosition` (currently `85% 15%`)
  - Mock setup: `IELTSMockTest` hardcoded `objectPosition` (`20% 45%`) during config
- Result: same intent, different code paths, different framing.

Implementation plan:
1) Create one source of truth for “auth/setup framing”
- Add shared constants (e.g. `src/lib/videoFraming.ts`):
  - `AUTH_SETUP_OBJECT_POSITION`
  - `ACTIVE_TEST_OBJECT_POSITION` (`center center`)
- Set `AUTH_SETUP_OBJECT_POSITION` to a value that is 20% further-left than current auth baseline (from 85% x to clamped max 100% x), keeping y alignment stable.

2) Remove conflicting position logic from CSS utility
- Keep `.auth-video-scale` only for non-position styling (or retire it if unused).
- Do not define `object-position` in that class anymore, so we never have “class vs inline” conflicts again.

3) Apply shared framing everywhere it should match
- `PageShell.tsx`: for non-fullWidth default, use `AUTH_SETUP_OBJECT_POSITION`.
- `IELTSMockTest.tsx`:
  - config phase uses `AUTH_SETUP_OBJECT_POSITION` (same as auth)
  - active phase keeps `ACTIVE_TEST_OBJECT_POSITION`.
- This guarantees auth + mock setup parity by construction.

4) Add a guardrail to prevent future drift
- Introduce a small typed preset API in `PageShell` (e.g. `videoPreset: "authSetup" | "center" | "custom"`), so pages stop passing ad-hoc raw strings.
- Internally map presets to shared constants.

5) Verification pass (single pass, no guesswork loop)
- At viewport ~1330×890:
  - `/login` and `/ielts/mock-test` (config phase) must visually match framing.
  - Teacher must appear ~20% further left vs previous auth baseline.
- Spot-check `/signup`, `/forgot-password`, `/reset-password`, `/select-week` for consistent non-fullWidth framing.
- Confirm active mock test still recenters as intended.

Technical details:
- Files to update:
  - `src/lib/videoFraming.ts` (new)
  - `src/components/PageShell.tsx`
  - `src/pages/IELTSMockTest.tsx`
  - `src/index.css` (remove/neutralize `.auth-video-scale` positioning rule)
- No backend/database/auth policy changes required.

Acceptance criteria:
- Auth screens and mock setup use the exact same position token.
- No screen-specific hardcoded `objectPosition` mismatch remains for these two flows.
- Teacher is visibly further left on auth/setup compared with current production state.
- Future tuning is one-value-only (single constant), not multi-file trial-and-error.
