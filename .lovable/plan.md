

## Simpler Alternative: STT Inactivity Timer (No Audio Analysis Needed)

The planned `useSilenceDetector` hook with `AnalyserNode` + RMS polling is overengineered for this use case. The Web Speech API **already stops firing `onResult`** when the user is silent — so we can simply track **time since the last STT result** using a basic `setTimeout`.

### Why This Is Better

| Approach | Complexity | CPU Cost | Accuracy |
|----------|-----------|----------|----------|
| AnalyserNode + RMS polling | New hook, AudioContext, RAF loop | Continuous | Can false-trigger on background noise |
| **STT inactivity timer** | One `setTimeout` reset on each `onResult` | Zero | Matches exactly what we care about: no speech recognized |

### Implementation

**Only 3 files need changes** (no new hook file):

**`src/lib/stt-provider.ts`** — Add `pause()` / `resume()` to `STTHandle` + built-in inactivity timer
- Add optional `onInactivity` callback and `inactivityMs` (default 10000) to a new config parameter
- On each `onResult`, reset a `setTimeout`. If it fires, call `onInactivity()`
- Add `pause()` (stops recognition, suppresses auto-restart) and `resume()` (restarts recognition)

**`src/components/speaking/LiveTranscriptBar.tsx`** — Add `isPaused` prop
- Show amber "⏸ Paused — No speech detected" banner when true

**`src/pages/IGCSESpeaking.tsx`** and **`src/pages/IELTSSpeaking.tsx`** — Wire pause/resume
- Pass `onInactivity` callback to `startListening` that sets `isPaused=true` and pauses the timer
- Mic button click when paused → resume STT + timer (not stop)
- Small stop button beside mic when paused to allow full stop
- Pass `isPaused` to `LiveTranscriptBar`

### Mic Button States (unchanged from previous plan)

```text
Idle       → White mic icon, click to start
Recording  → Red pulsing stop square, click to stop  
Paused     → Amber mic icon + "Tap to Resume", click to resume
             Small stop (×) button beside it
```

This eliminates an entire hook file and avoids running a continuous audio analysis loop alongside the existing STT.

