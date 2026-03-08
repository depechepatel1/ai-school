

## Problem

The curriculum fetch service (`curriculum-storage.ts`) is reading from the **wrong bucket and wrong file path**. It hardcodes:
- Bucket: `curriculum` (old)
- File: `igcse-shadowing.json` / `ielts-shadowing.json`

But the admin upload (`AdminCurriculumUpload.tsx`) stores files in:
- Bucket: `curriculums` (new)
- Path: `igcse/shadowing-fluency.json` / `ielts/shadowing-fluency.json`

Additionally, an in-memory cache prevents picking up new uploads without a page refresh.

## Plan

### 1. Update `fetchCurriculumJSON` to use `curriculum_metadata`

Instead of hardcoding bucket/path, query the `curriculum_metadata` table for the active version's `file_path`, then fetch from the `curriculums` bucket. Fall back to old bucket and local files if no metadata exists.

### 2. Add cache-busting for new uploads

Add a `?t=<timestamp>` query parameter to the storage URL to bypass browser/CDN caching, and clear the in-memory Map cache when a new version is detected.

### 3. Verify speaking question fetch path

The `getSpeakingQuestions` function reuses the same `fetchCurriculumJSON` data, so fixing that function fixes speaking too. However, speaking questions may use a separate `speaking` module type -- need to confirm if a separate fetch path is needed or if it's part of the same JSON.

### Technical Details

**`src/services/curriculum-storage.ts` changes:**
- `fetchCurriculumJSON` will first query `curriculum_metadata` for active `shadowing-fluency` module
- Use the returned `file_path` to fetch from `curriculums` bucket
- Keep fallback chain: `curriculums` bucket -> `curriculum` bucket (old) -> local `/data/`
- Add timestamp param to bust cache

