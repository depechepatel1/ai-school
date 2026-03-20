

# Fix: "Worker did not acknowledge" in TTS Timing

## Root Cause

The timing worker uses `BroadcastChannel` for communication between the main app and a popup window. This fails because:

1. **Origin mismatch in preview**: The Lovable preview runs inside an iframe. When `window.open()` is called from within the iframe, the popup may load on a slightly different origin, and `BroadcastChannel` only works same-origin.
2. **Fallback gap**: The 8-second timeout is too short if the popup loads slowly, and there's no fallback communication mechanism.

## Fix

Replace `BroadcastChannel` with direct `window.postMessage()` between the parent and popup window. This works cross-origin and is more reliable for popup communication.

### Changes

**`src/lib/timing-worker-channel.ts`**:
- Replace all `BroadcastChannel` usage with `window.postMessage()` to the popup window reference (already stored in `workerWindow`)
- Listen for replies via `window.addEventListener("message", ...)` with origin checking
- Keep the same retry/ack handshake logic, just swap the transport

**`public/timing-worker.html`**:
- Replace `BroadcastChannel` with `window.opener.postMessage()` for sending messages back to parent
- Listen via `window.addEventListener("message", ...)` for incoming commands
- Keep the READY interval broadcasting via `window.opener.postMessage()`
- Add `window.opener` null check with fallback error display

### Files to edit
| File | Change |
|------|--------|
| `src/lib/timing-worker-channel.ts` | Switch from BroadcastChannel to window.postMessage |
| `public/timing-worker.html` | Switch from BroadcastChannel to window.opener.postMessage |

