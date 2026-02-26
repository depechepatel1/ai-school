-- Create a trigger that automatically inserts the user role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
BEGIN
  -- Get role from user metadata set during signup
  _role := (NEW.raw_user_meta_data->>'role')::app_role;
  IF _role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
