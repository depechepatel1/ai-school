

## Local-First Voice Selection (Implemented)

### Solution
Tiered priority system using `v.localService` API property:

1. **Local Natural** (`localService=true` + "Natural") — Edge built-in, zero latency
2. **Local accent match** (`localService=true`)
3. **Cloud Natural** — Chrome cloud voices, some latency
4. **Cloud accent match**
5. **Any English voice**

### Adaptive Timeouts (timing-worker)
- Local voices: 3s startup, 4–15s overall
- Cloud voices: 8s startup, 6–30s overall

### Browser Banner
- Edge: no banner
- Chrome: soft info banner recommending Edge
- Other: warning about limited voice support

### Files changed
- `src/lib/tts-provider.ts` — refactored `findVoices()`, added `isLocalVoice()` export
- `public/timing-worker.html` — `localService`-based voice selection + adaptive timeouts
- `src/components/student/BrowserBanner.tsx` — tiered browser messaging with severity levels
