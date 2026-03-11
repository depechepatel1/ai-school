

## Task: Seed Demo Practice Data for dev-ielts Student

The `create-dev-accounts` edge function currently creates accounts, classes, and memberships but seeds no practice data. We need to add practice log entries so the IELTS student account shows meaningful streak, homework progress, and reporting data.

### What to change

**File: `supabase/functions/create-dev-accounts/index.ts`**

Add a new section (step 6) after the parent linking that seeds `student_practice_logs` for the IELTS student:

- **Streak data**: Insert practice logs for the last 5 consecutive days (today through 4 days ago) so the streak widget shows "5 Day Streak"
- **Today's homework progress**: Insert partial progress for today — shadowing: 600s of 900s target, pronunciation: 600s (complete), speaking: 480s of 1200s — so the tasks panel shows mixed completion states
- **Historical weekly data**: Insert logs across the past 4 weeks with varied activity types and both `homework` and `independent` practice modes, so the reporting/analytics charts have trend data
- All logs use `course_type: 'ielts'`, `week_number` corresponding to the current week cycle, and realistic `active_seconds` values
- Use upsert-safe inserts (check for existing data first to avoid duplicates on re-run)

**Data shape per row** (matching `student_practice_logs` schema):
- `user_id`: IELTS student ID
- `activity_type`: shadowing | pronunciation | speaking
- `course_type`: ielts
- `practice_mode`: homework | independent
- `week_number`: 1-4
- `active_seconds`: varied realistic values
- `target_seconds`: matches TARGETS config (900/600/1200)
- `created_at`: offset dates for streak + historical data

### Volume
- ~5 rows for today's partial homework
- ~15-20 rows spread across the last 4 weeks for trend charts
- ~5 rows for consecutive daily streak (1 per day, last 5 days)

Total: ~25-30 rows inserted into `student_practice_logs`.

No schema changes needed — this is purely data seeding via the existing edge function.

