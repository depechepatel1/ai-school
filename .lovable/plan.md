

## Problem

When a new curriculum is uploaded, the old timing file still exists in storage. The "Measure Missing" button does a HEAD check and sees it's there, so it skips re-measurement. The user needs to re-measure only pronunciation timings without re-running the hours-long fluency measurements.

## Solution

Add per-module "Re-measure" buttons next to each timing job, and enhance the upload flow to automatically delete the corresponding timing file when a new curriculum is uploaded (so "Measure Missing" naturally picks it up).

### Changes to `AdminCurriculumUpload.tsx`

1. **Auto-invalidate timings on curriculum upload**: In `commitUpload`, after successfully uploading a new curriculum file, delete the corresponding timing file from storage. Map:
   - `ielts/shadowing-fluency.json` → delete `ielts/timings-shadowing-fluency.json`
   - `igcse/shadowing-fluency.json` → delete `igcse/timings-shadowing-fluency.json`
   - `shared/tongue-twisters.json` → delete `shared/timings-shadowing-pronunciation.json`

   This ensures "Measure Missing" will detect the stale timing as missing after any curriculum re-upload.

2. **Add individual re-measure buttons**: Below the existing two-button grid, add a section showing each timing job with a small "Re-measure" button, so admins can selectively re-measure a single module without touching the others. Each button calls `handleMeasureAll` logic but for a single job only.

### Technical Detail

- The timing file path mapping will be a simple lookup function: `getTimingPath(filePath)`.
- The delete call uses `supabase.storage.from("curriculums").remove([timingPath])` — non-destructive if the file doesn't exist.
- Individual re-measure buttons will call a new `handleMeasureSingle(jobIndex)` that runs only one job from the jobs array, ignoring HEAD checks.

