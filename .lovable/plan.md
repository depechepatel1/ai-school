
Goal: stop constant timeout loops in “Time IELTS Fluency” popup and make timing measurement reliable.

Why this is happening now:
1. The chunks that timeout are short (e.g., “To begin with, I want to talk about my uncle,”), so this is not a “text too long” issue.
2. In `public/timing-worker.html`, `measureSingle()` returns `15000` both on real timeout and on any `onerror`, but the log always labels it as “Timeout”, hiding the true failure cause.
3. The worker picks one voice via `findVoice()` and retries the same text mostly with the same voice; no robust voice failover exists.
4. Current available voices are Microsoft “Online (Natural)” voices, which are more likely to fail in popup/background/sandbox contexts. Since worker lacks blacklist/fallback logic, it keeps producing 15s sentinel results.

Implementation plan:
1. Harden worker voice strategy
- Replace single-voice `findVoice()` with a prioritized candidate list (local natural first, then online, then any matching accent, then any English).
- Add a `failedVoiceNames` blacklist in worker session.
- On `synthesis-failed`/`network`/repeated no-start, mark current voice failed and switch to next candidate.

2. Improve measurement result model in worker
- Change `measureSingle()` to return structured output: `{ duration, status, errorType, started, voiceName }`.
- Distinguish:
  - `ok` (real duration),
  - `error` (speech synthesis error type),
  - `timeout_no_start`,
  - `timeout_after_start`.
- Log exact error types in popup UI.

3. Retry and fallback flow
- For each chunk:
  - attempt with selected voice,
  - on failure, rotate to next voice and retry (bounded attempts),
  - final fallback: measure using system default voice (no explicit `utterance.voice`),
  - if everything fails, do not silently store raw 15000 as “normal”; mark as fallback-estimated or skipped.
- Keep existing batch rest/warmup/cancel behavior.

4. Safe timeout policy
- Replace fixed 15s with adaptive timeout based on cleaned text length (with min/max bounds).
- Keep current warmup and cancel delays, but add no-start detection timer so failed starts rotate faster.

5. Data quality + UI feedback
- Store metadata in output JSON for troubleshooting (e.g., failure count, fallback used).
- In popup log, show voice name and reason (e.g., `network`, `synthesis-failed`) instead of generic “Timeout”.
- In parent toast/status, summarize if any chunks used fallback estimation.

Technical details:
- Files to update:
  - `public/timing-worker.html` (main reliability fix, logging, retry/fallback)
  - Optional alignment update in `src/lib/tts-measure.ts` to keep non-popup timing path behavior consistent
- No database schema or backend changes required.
- Keep `postMessage` worker channel as-is; issue is in speech synthesis execution and voice failover inside popup.

Validation checklist:
1. Run “Time IELTS Fluency” and verify first 20 chunks no longer all land at 15000ms.
2. Confirm popup logs include explicit failure reason + voice switching when failures occur.
3. Verify partial save/final upload still works.
4. Re-run full IELTS timing and check duration distribution looks realistic (not dominated by a single sentinel value).
