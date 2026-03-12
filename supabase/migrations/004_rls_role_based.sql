-- Role-based RLS: restrict data by role
-- ADMIN: full org access
-- CLINIC_MANAGER: only their clinic
-- STAFF: only their clinic

-- Update get_user_organization_ids to include users table (for auth users)
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  UNION
  SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: user's clinic (for staff/manager)
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_location_id FROM users WHERE id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Clinic locations: Admin sees all org clinics; Manager/Staff see only their clinic
DROP POLICY IF EXISTS "Users can read clinic locations in org" ON clinic_locations;
DROP POLICY IF EXISTS "Users can insert clinic locations in org" ON clinic_locations;
DROP POLICY IF EXISTS "Users can update clinic locations in org" ON clinic_locations;
CREATE POLICY "Users read clinics by role"
  ON clinic_locations FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    AND (
      get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() IN ('CLINIC_MANAGER', 'STAFF') AND id = get_user_clinic_id())
    )
  );
CREATE POLICY "Admins insert clinic locations"
  ON clinic_locations FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_organization_ids())
    AND (get_user_role() = 'ADMIN' OR get_user_role() IS NULL)
  );
CREATE POLICY "Admins and managers update clinic locations"
  ON clinic_locations FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    AND (
      get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() = 'CLINIC_MANAGER' AND id = get_user_clinic_id())
    )
  );

-- Staff: same pattern - drop both read and manage, add role-based
DROP POLICY IF EXISTS "Users can read staff in org" ON staff;
DROP POLICY IF EXISTS "Users can manage staff in org" ON staff;
CREATE POLICY "Users read staff by role"
  ON staff FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    AND (
      get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() IN ('CLINIC_MANAGER', 'STAFF') AND clinic_location_id = get_user_clinic_id())
    )
  );
CREATE POLICY "Admins and managers insert staff"
  ON staff FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_organization_ids())
    AND (get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() = 'CLINIC_MANAGER' AND clinic_location_id = get_user_clinic_id()))
  );
CREATE POLICY "Admins and managers update staff"
  ON staff FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    AND (get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() = 'CLINIC_MANAGER' AND clinic_location_id = get_user_clinic_id()))
  );
CREATE POLICY "Admins and managers delete staff"
  ON staff FOR DELETE
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    AND (get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() = 'CLINIC_MANAGER' AND clinic_location_id = get_user_clinic_id()))
  );

-- Appointments: Admin sees all in org; Manager/Staff see only their clinic
DROP POLICY IF EXISTS "Users can read appointments in org" ON appointments;
DROP POLICY IF EXISTS "Users can manage appointments in org" ON appointments;
CREATE POLICY "Users read appointments by role"
  ON appointments FOR SELECT
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations
      WHERE organization_id IN (SELECT get_user_organization_ids())
    )
    AND (
      get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() IN ('CLINIC_MANAGER', 'STAFF') AND clinic_location_id = get_user_clinic_id())
    )
  );
CREATE POLICY "Users manage appointments by role"
  ON appointments FOR INSERT
  WITH CHECK (
    clinic_location_id IN (
      SELECT id FROM clinic_locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
    AND (
      get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() IN ('CLINIC_MANAGER', 'STAFF') AND clinic_location_id = get_user_clinic_id())
    )
  );
CREATE POLICY "Users update appointments by role"
  ON appointments FOR UPDATE
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
    AND (
      get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() IN ('CLINIC_MANAGER', 'STAFF') AND clinic_location_id = get_user_clinic_id())
    )
  );
CREATE POLICY "Users delete appointments by role"
  ON appointments FOR DELETE
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
    AND (
      get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() IN ('CLINIC_MANAGER', 'STAFF') AND clinic_location_id = get_user_clinic_id())
    )
  );
