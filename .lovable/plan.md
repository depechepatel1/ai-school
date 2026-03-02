

## Plan: Update Dev Accounts Edge Function

### Current State
- Three old dev accounts exist: `dev-student@test.com`, `dev-teacher@test.com`, `dev-parent@test.com`
- One IGCSE class exists (`Test IGCSE Class`), but no IELTS class
- The edge function needs updating to create 5 accounts matching the new PageShell config

### Changes

#### 1. Update `supabase/functions/create-dev-accounts/index.ts`

Replace the `DEV_ACCOUNTS` array with 5 accounts:
- `dev-igcse@test.com` (student, "Dev IGCSE Student")
- `dev-ielts@test.com` (student, "Dev IELTS Student")
- `dev-teacher@test.com` (student→teacher, "Dev Teacher")
- `dev-parent@test.com` (parent, "Dev Parent")
- `dev-admin@test.com` (admin→teacher role, "Dev Admin")

Add post-creation logic:
1. Create an IELTS class owned by the teacher account (if not exists)
2. Ensure the existing IGCSE class exists (or create one) owned by the teacher
3. Add `dev-igcse@test.com` to the IGCSE class membership
4. Add `dev-ielts@test.com` to the IELTS class membership
5. Link `dev-parent@test.com` to both student accounts in `parent_student_links`

Note: The `admin` role doesn't exist in the `app_role` enum (only `student`, `teacher`, `parent`). The admin account will be assigned the `teacher` role for now.

#### 2. Deploy and invoke the function

After updating, deploy the edge function and call it to provision all accounts.

### Files Modified

| File | Change |
|---|---|
| `supabase/functions/create-dev-accounts/index.ts` | Update accounts list, add class creation + membership + parent linking logic |

