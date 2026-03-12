-- Fix infinite recursion: policies that SELECT from users trigger RLS on users again.
-- Use SECURITY DEFINER function to read current user's org/role without triggering RLS.

CREATE OR REPLACE FUNCTION public.get_admin_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM public.users
  WHERE id = auth.uid() AND is_active = true AND role = 'ADMIN'
  LIMIT 1;
$$;

-- Drop and recreate policies that caused recursion
DROP POLICY IF EXISTS "Admins can read users in org" ON users;
CREATE POLICY "Admins can read users in org"
  ON users FOR SELECT
  USING (organization_id = get_admin_org_id());

DROP POLICY IF EXISTS "Admins can insert users in org" ON users;
CREATE POLICY "Admins can insert users in org"
  ON users FOR INSERT
  WITH CHECK (organization_id = get_admin_org_id());

DROP POLICY IF EXISTS "Admins can update users in org" ON users;
CREATE POLICY "Admins can update users in org"
  ON users FOR UPDATE
  USING (organization_id = get_admin_org_id());
