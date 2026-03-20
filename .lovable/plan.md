

## Background TTS Timing Process

### Problem
The TTS timing measurement uses `SpeechSynthesis`, a browser-only API. It runs in the main page, so any navigation or HMR refresh kills the process. The user wants to keep working while timings run.

### Solution: Popup Window Runner
Open a minimal standalone popup window that runs the timing measurement independently. The main app stays fully usable. The popup communicates progress back via `BroadcastChannel` and uploads results directly to storage.

### How it works

```text
Main App (Admin)                    Popup Window
─────────────────                   ─────────────
Click "Time IELTS"  ──────────►    Opens /timing-worker.html
                                    Loads timing script
                                    Runs SpeechSynthesis loop
Progress bar updates ◄──────────   Sends progress via BroadcastChannel
                                    Uploads JSON to storage on completion
"Done" toast         ◄──────────   Sends completion message
```

### Changes

1. **`public/timing-worker.html`** (new) — Minimal standalone HTML page with inline JS that:
   - Receives config (courseType, accent, rate, chunks) via URL params or `BroadcastChannel`
   - Runs the `SpeechSynthesis` measurement loop (same logic as `tts-measure.ts`)
   - Posts progress updates back via `BroadcastChannel`
   - Uploads the final JSON to storage using the Supabase REST API directly
   - Saves progress incrementally (every 10 chunks) so partial results survive even if the popup closes
   - Shows a simple progress display in the popup itself

2. **`src/lib/timing-worker-channel.ts`** (new) — Thin wrapper around `BroadcastChannel` for type-safe messaging between main app and popup:
   - `launchTimingWorker(config)` — opens popup, sends config
   - `onTimingProgress(callback)` — listen for progress updates
   - `onTimingComplete(callback)` — listen for completion

3. **`src/components/admin/AdminCurriculumUpload.tsx`** — Update timing job handlers:
   - Replace direct `generateAndUploadFluencyTimings()` calls with `launchTimingWorker()`
   - Listen for progress/completion via the channel
   - Show "Running in background" indicator instead of blocking the UI
   - Cancel sends a message to the popup to stop

4. **`src/services/tts-timings-storage.ts`** — Add a function to extract chunk lists without running measurement (the popup needs the chunk list), e.g. `getFluencyChunkTexts(courseType)` and `getPronunciationChunkTexts()`.

### Key details
- The popup is a plain HTML file (no React/Vite), so HMR cannot affect it
- Uses the Supabase REST API directly (anon key from env) for storage uploads
- Incremental saves every 10 chunks means partial progress survives popup closure
- The main app can detect existing partial timings and show "Resume" option
- BroadcastChannel works across same-origin tabs/popups without references

