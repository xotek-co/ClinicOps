-- Trigger: auto-create user in users table when auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
BEGIN
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  IF user_name = '' OR user_name IS NULL THEN
    user_name := 'User';
  END IF;

  INSERT INTO public.users (id, organization_id, role, name, email)
  VALUES (
    NEW.id,
    NULL,
    'STAFF',
    user_name,
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if present (from 003)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Allow users to update their own profile (for signup flow to set org/role)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());
