

## Fix: Old Pronunciation File Still Being Timed + Rename Buttons

### Bug: Wrong file being timed

The `pronunciation-shadowing.ts` service has a **fallback chain** that tries three sources in order:
1. `curriculums` bucket → `shared/tongue-twisters.json`
2. `curriculum` bucket (singular) → `tongue-twisters.json` ← **stale old file here**
3. Local `/data/tongue-twisters.json` ← **another stale fallback**

If the primary bucket file fails for any reason, it silently falls back to the old `curriculum` bucket or local file. This second fallback (lines 38-51) references a different bucket (`curriculum` vs `curriculums`) that likely still contains the old tongue-twisters data.

**Fix**: Remove the second fallback to the `curriculum` bucket entirely. Keep only the primary `curriculums` bucket fetch and the local fallback (which should also be updated or removed if no longer needed).

### Button Renaming

Current labels are vague. Rename for clarity:

| Current | New |
|---------|-----|
| "Measure Missing" | "Time Missing" |
| "Force All" | "Re-time All" |
| "IELTS Fluency" | "Time IELTS Fluency" |
| "IGCSE Fluency" | "Time IGCSE Fluency" |
| "Pronunciation" | "Time Pronunciation" |

### Files to change

1. **`src/services/pronunciation-shadowing.ts`** — Remove the stale `curriculum` (singular) bucket fallback (lines 37-51)
2. **`src/components/admin/AdminCurriculumUpload.tsx`** — Update `TIMING_JOBS` labels and button text for "Measure Missing" and "Force All"

