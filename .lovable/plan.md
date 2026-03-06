

## Phase 1: Database & Curriculum Storage Setup

### Step 1.1 — Create `curriculums` Storage Bucket

Single migration to:
- Create a new public bucket `curriculums`
- Add storage RLS policies: authenticated read; admins/teachers write

### Step 1.2 — Create 4 Database Tables

All in one migration with RLS and seed data:

**`curriculum_metadata`** — tracks active JSON files in the bucket
- id (uuid PK), course_type (text), module_type (text), file_path (text), version (int default 1), uploaded_at (timestamptz), uploaded_by (uuid), is_active (boolean default true)
- RLS: authenticated read; admin/teacher insert; admin update/delete

**`student_progress`** — per-student resume position
- id (uuid PK), student_id (uuid), course_type (text), module_type (text), current_position (jsonb default '{}'), last_accessed (timestamptz)
- Unique on (student_id, course_type, module_type)
- RLS: own data read/upsert; teachers/parents/admins can read

**`practice_time_log`** — session duration tracking
- id (uuid PK), student_id (uuid), course_type (text), module_type (text), session_date (date), required_time_seconds (int default 0), extended_time_seconds (int default 0), total_time_seconds (int default 0), week_number (int default 1), created_at (timestamptz)
- RLS: own data read/insert; teachers/parents/admins can read

**`timer_settings`** — admin-configurable countdown durations
- id (uuid PK), course_type (text), module_type (text), countdown_minutes (int), updated_by (uuid), updated_at (timestamptz)
- Unique on (course_type, module_type)
- RLS: authenticated read; admin insert/update
- Seeded with 6 rows:

| Course | Module | Minutes |
|--------|--------|---------|
| ielts | shadowing-pronunciation | 5 |
| ielts | shadowing-fluency | 10 |
| ielts | speaking | 12 |
| igcse | shadowing-pronunciation | 5 |
| igcse | shadowing-fluency | 10 |
| igcse | speaking | 10 |

### File Mapping (for later upload steps)

| Uploaded File | Bucket Path |
|--------------|-------------|
| Tongue_Twisters_Curriculum.txt | `shared/tongue-twisters.json` (also serves as `ielts/shadowing-pronunciation.json`) |
| IELTS_APP_Shadowing_chunks-3.txt | `ielts/shadowing-fluency.json` |
| master_Curiculum.json | `ielts/speaking-questions.json` |
| IGCSE_Course_Shadowing_Chunks-3.txt | `igcse/shadowing-fluency.json` |
| IGCSE_pronunciation_shadowing.txt | `igcse/shadowing-pronunciation.json` |
| IGCSE_course_data.csv | `igcse/speaking-questions.json` (will convert to JSON) |

No code files change in this step — purely database/storage infrastructure.

