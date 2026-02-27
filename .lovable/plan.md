

## Plan: Migrate Videos from Cloudinary to Backend Storage

### Step 1: Create storage bucket (SQL migration)
Create a public `videos` bucket with read-access RLS policy for anonymous users.

### Step 2: Create one-time `upload-videos` edge function
- Downloads all 9 clips from Cloudinary + the intro video (VIDEO_2)
- Uploads to `videos/loop-stack/1.mp4` through `9.mp4` and `videos/intro.mp4`
- Returns the public URLs

### Step 3: Update `PageShell.tsx`
- Replace Cloudinary URLs with storage public URLs constructed from `VITE_SUPABASE_URL`
- Keep `VIDEO_1_STACK` array and all playback logic unchanged

### Step 4: Update `App.tsx` prefetch list
- Point all prefetch `<link>` tags to the new storage URLs

### Step 5: Run the edge function once to perform the migration

### Step 6: Verify playback works identically

### Technical notes
- Total storage: ~20-45 MB for 10 videos
- Public bucket means no auth needed for reads
- URLs follow pattern: `${SUPABASE_URL}/storage/v1/object/public/videos/loop-stack/1.mp4`
- The existing crossfade/seamless switching logic in PageShell remains unchanged

