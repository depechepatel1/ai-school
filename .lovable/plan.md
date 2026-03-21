

# Batch 4: Consolidate Duplicate Auth Triggers

## What
Merge two separate auth triggers into one atomic function so profile creation and role assignment always succeed or fail together.

## Current state (confirmed)
- `on_auth_user_created` → calls `handle_new_user()` (inserts profile)
- `on_auth_user_created_role` → calls `handle_new_user_role()` (inserts role)

Both fire independently on `auth.users` INSERT, risking partial state if one fails.

## Migration SQL (one new file)

```sql
-- 1. Drop the separate role trigger
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- 2. Drop the now-unused role function
DROP FUNCTION IF EXISTS public.handle_new_user_role();

-- 3. Replace handle_new_user to do both inserts atomically
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  -- Assign role (default to student)
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'student')::app_role;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
```

## No other changes
- Existing `on_auth_user_created` trigger remains, now calling the updated function
- No TypeScript files modified
- No existing migrations touched

