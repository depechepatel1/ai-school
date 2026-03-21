
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
