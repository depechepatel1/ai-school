

## Plan: Create a Video Upload Page

Since you can't access the backend storage directly, I'll build a simple admin-only upload page in the app where you can drag-and-drop your re-encoded videos.

### What Gets Built

**1. New page: `/admin/upload-videos`**
- A simple drag-and-drop zone that accepts `.mp4` files
- Shows the 12 expected filenames as a checklist: `intro.mp4`, `1.mp4` through `10.mp4`, `analysis-bg.mp4`
- You drop a file, pick which slot it goes to, and it uploads directly to storage (overwriting the old H.265 version)
- Shows upload progress and a green checkmark when done
- Only accessible to admin users

**2. New edge function: `upload-video-file`**
- Receives the video file and target path
- Uses the service role key to overwrite the existing file in the `videos` bucket with `contentType: video/mp4`
- Validates that the target path is one of the 12 expected paths

**3. Add route in `App.tsx`**
- Protected admin route at `/admin/upload-videos`

### How You'll Use It
1. Open the app and log in as admin
2. Navigate to `/admin/upload-videos`
3. For each video, select the slot (e.g., "Loop 1", "Loop 2", "Intro") and drop the file
4. Wait for the upload to complete (green checkmark)
5. Once all 12 are done, navigate to the student dashboard and the videos will play

### Files
- `supabase/functions/upload-video-file/index.ts` — new edge function
- `src/pages/AdminUploadVideos.tsx` — new upload page
- `src/App.tsx` — add route
- `supabase/config.toml` — register the new function

