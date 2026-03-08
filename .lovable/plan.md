

## CSV Curriculum Upload Support

### Problem
The IGCSE curriculum is maintained as a CSV file with 28 columns per row (one row per week). The app's curriculum system expects a specific JSON structure with chunked text. Currently there's no way to upload CSV and have it work.

### Approach: Convert CSV to JSON at Upload Time

Rather than changing the entire fetch/render pipeline to understand CSV, we convert CSV to the existing JSON format during upload in `AdminCurriculumUpload.tsx`. This keeps all downstream code (fetching, chunking, rendering) unchanged.

### CSV Column Mapping

From the uploaded CSV, the relevant columns for the **shadowing-fluency** module are:

| CSV Column | Maps To |
|---|---|
| `week_number` | `week_number` |
| `warmup_questions` | `transcoded` section → `question_text` |
| `transcoded_input` | `transcoded` section → chunks (auto-split) |
| `circuit_prompt_intro` + `circuit_prompt_points` | `model_answer` section → `question_text` |
| `model_answer` | `model_answer` section → chunks (auto-split) |

### Auto-Chunking Logic

The `transcoded_input` and `model_answer` columns contain full HTML paragraphs. We need to split them into ~8-12 word chunks at natural boundaries:
1. Strip HTML tags to get plain text
2. Split on sentence boundaries (periods, commas at clause breaks)
3. Merge short fragments, split long ones to stay in the 8-12 word range
4. Number chunks sequentially

### Implementation

**File: `src/services/csv-to-curriculum.ts`** (new)
- `parseCSVToCurriculum(csvText: string): CurriculumData` function
- CSV parser using simple split logic (the CSV uses standard quoting)
- HTML tag stripper
- Sentence-boundary chunker (split on `. `, `, ` at clause boundaries)
- Returns the same `CurriculumData` structure the app already uses

**File: `src/components/admin/AdminCurriculumUpload.tsx`** (edit)
- In `handleUpload`, detect `.csv` extension
- Call `parseCSVToCurriculum()` to convert to JSON
- Upload the resulting JSON blob to storage (same as current flow)
- Rest of the metadata/versioning logic stays identical

### Chunk Splitting Strategy

Split the HTML-rich text into chunks:
1. Strip all HTML tags (`<span>`, `<strong>`, `<mark>`, etc.)
2. Split on sentence endings (`. `) and clause boundaries (`, ` followed by a connector word)
3. Target 8-12 words per chunk
4. Keep Chinese annotations in parentheses attached to their preceding word

