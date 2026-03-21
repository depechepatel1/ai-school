

# Batch 2: Add Missing Foreign Key Constraints

## What
Create a single new migration that adds foreign key constraints to 4 tables whose user ID columns currently have no referential integrity enforcement.

## Why
Without these constraints, rows can reference non-existent users, creating orphaned data. All 4 tables currently have zero orphaned rows, so the constraints will apply cleanly.

## Migration SQL

One new migration file with:

1. **Cleanup guards** — DELETE orphaned rows (safety net, currently 0 matches)
2. **Add constraints:**
   - `student_curriculum_progress.user_id` → `auth.users(id)` ON DELETE CASCADE
   - `practice_time_log.student_id` → `auth.users(id)` ON DELETE CASCADE
   - `student_progress.student_id` → `auth.users(id)` ON DELETE CASCADE
   - `timer_settings.updated_by` → `auth.users(id)` ON DELETE SET NULL

## No other changes
- No TypeScript files modified
- No existing migrations touched
- No RLS policy changes

