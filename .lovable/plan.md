

## Diagnosis: Concurrent Video Uploads Failing

**Root cause**: When multiple large video files are uploaded simultaneously, each request to the `upload-video-file` edge function must:
1. Boot a new isolate (~30ms each, visible in logs)
2. Buffer the entire video file in memory via `req.formData()` + `file.arrayBuffer()`
3. Re-upload to storage

Edge functions have a **~150MB memory limit** and **~60s timeout**. Multiple concurrent large video uploads exhaust these limits, causing silent crashes (the logs show only boot/shutdown cycles with no request-level output).

**Solution**: Serialize uploads on the client side so only one file uploads at a time.

---

### Changes

**File: `src/pages/AdminUploadVideos.tsx`**

1. Add an upload queue mechanism:
   - Track a `queue` of `{ file, slot }` pairs in a ref
   - Track an `isProcessing` flag ref
   - When the user selects/drops a file, push it onto the queue and call `processQueue()`
   - `processQueue()` picks one item at a time, calls `uploadFile`, then recurses until the queue is empty

2. This replaces the current behavior where each `handleFileSelect` / `handleDrop` immediately calls `uploadFile` — allowing N concurrent requests.

3. No edge function changes needed. No database changes needed.

**Key detail**: The queue drains sequentially — each upload completes (success or error) before the next begins. The UI remains responsive since each slot still shows its own progress/status independently.

