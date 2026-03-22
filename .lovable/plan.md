

## Revised Plan: Local-First Voices with Cross-Browser Fallback

### Problem
The previous plan hardcoded Edge-only local Natural voices. If a student uses Chrome, Safari, or Firefox, no Natural voices exist and TTS would fail silently or use low-quality voices.

### Solution
A **tiered priority system** that prefers local voices but gracefully falls back on non-Edge browsers, plus adjusted timeouts based on whether the selected voice is local or cloud.

### Changes

**1. `src/lib/tts-provider.ts` — `findVoices()`**
- New priority chain using `v.localService` property:
  1. Local Natural voices (`localService === true` + name includes "Natural")
  2. Any local voice matching the accent
  3. Cloud/online Natural voices (for Chrome which has good cloud voices)
  4. Any voice matching the accent
  5. Any English voice
- Export a helper `isLocalVoice(): boolean` so the timing worker and UI can adapt behavior based on which voice was selected
- Log a warning when falling back to cloud voices

**2. `public/timing-worker.html` — adaptive timeouts**
- Check if the selected voice is local (`localService === true`)
- Local voices: tight timeouts (3s startup, 4–15s overall)
- Cloud voices: generous timeouts (8s startup, 6–30s overall) — keeps current tolerant values
- This way Edge users get instant performance while Chrome users still work reliably

**3. `src/components/student/BrowserBanner.tsx`**
- Edge: no banner (optimal experience)
- Chrome: soft recommendation — "For the best experience, use Microsoft Edge. Chrome works but may have slightly slower voice responses."
- Other browsers: stronger warning about limited voice support
- Keep the dismissible behavior

### Priority chain summary

```text
Edge:    localNatural → localOther → cloudNatural → anyAccent → anyEnglish
Chrome:  cloudNatural → localNatural → anyAccent → anyEnglish
Safari:  localNatural → anyAccent → anyEnglish
Firefox: anyAccent → anyEnglish → system default
```

### Files to edit
- `src/lib/tts-provider.ts` — refactor `findVoices()`, export `isLocalVoice()`
- `public/timing-worker.html` — adaptive timeouts based on voice locality
- `src/components/student/BrowserBanner.tsx` — tiered browser messaging

