-- Complete RLS policies for all tables
-- Fills gaps: organizations INSERT, patients/services role-based, revenue_records, weekly_reports, organization_users
-- Also: clinic_locations UPDATE allows CLINIC_MANAGER to edit/archive their own clinic

-- =============================================================================
-- CLINIC_LOCATIONS - Allow CLINIC_MANAGER to update (edit/soft delete) their clinic
-- =============================================================================
DROP POLICY IF EXISTS "Admins update clinic locations" ON clinic_locations;
DROP POLICY IF EXISTS "Admins and managers update clinic locations" ON clinic_locations;

CREATE POLICY "Admins and managers update clinic locations"
  ON clinic_locations FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    AND (
      get_user_role() = 'ADMIN' OR get_user_role() IS NULL
      OR (get_user_role() = 'CLINIC_MANAGER' AND id = get_user_clinic_id())
    )
  );

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================
-- Allow authenticated users to create org (signup flow)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================================================
-- ORGANIZATION_USERS (legacy - used alongside users table)
-- =============================================================================
CREATE POLICY "Users can insert org membership"
  ON organization_users FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_organization_ids())
  );

CREATE POLICY "Admins can manage org memberships"
  ON organization_users FOR ALL
  USING (organization_id = get_admin_org_id())
  WITH CHECK (organization_id = get_admin_org_id());

-- =============================================================================
-- PATIENTS - Role-based: Admin + Manager can manage, all org can read
-- =============================================================================
DROP POLICY IF EXISTS "Users can read patients in org" ON patients;
DROP POLICY IF EXISTS "Users can manage patients in org" ON patients;

CREATE POLICY "Users read patients in org"
  ON patients FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Admins and managers insert patients"
  ON patients FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_organization_ids())
    AND (get_user_role() = 'ADMIN' OR get_user_role() = 'CLINIC_MANAGER' OR get_user_role() IS NULL)
  );

CREATE POLICY "Admins and managers update patients"
  ON patients FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    AND (get_user_role() = 'ADMIN' OR get_user_role() = 'CLINIC_MANAGER' OR get_user_role() IS NULL)
  );

CREATE POLICY "Admins and managers delete patients"
  ON patients FOR DELETE
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    AND (get_user_role() = 'ADMIN' OR get_user_role() = 'CLINIC_MANAGER' OR get_user_role() IS NULL)
  );

-- =============================================================================
-- SERVICES - Role-based: Admin only can manage
-- =============================================================================
DROP POLICY IF EXISTS "Users can read services in org" ON services;
DROP POLICY IF EXISTS "Users can manage services in org" ON services;

CREATE POLICY "Users read services in org"
  ON services FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Admins insert services"
  ON services FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_organization_ids())
    AND (get_user_role() = 'ADMIN' OR get_user_role() IS NULL)
  );

CREATE POLICY "Admins update services"
  ON services FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    AND (get_user_role() = 'ADMIN' OR get_user_role() IS NULL)
  );

CREATE POLICY "Admins delete services"
  ON services FOR DELETE
  USING (
    organization_id IN (SELECT get_user_organization_ids())
    AND (get_user_role() = 'ADMIN' OR get_user_role() IS NULL)
  );

-- =============================================================================
-- REVENUE_RECORDS - Role-based read + insert for admin/manager
-- =============================================================================
DROP POLICY IF EXISTS "Users can read revenue in org" ON revenue_records;

CREATE POLICY "Admins and managers read revenue"
  ON revenue_records FOR SELECT
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations
      WHERE organization_id IN (SELECT get_user_organization_ids())
      AND (
        get_user_role() = 'ADMIN' OR get_user_role() IS NULL
        OR (get_user_role() = 'CLINIC_MANAGER' AND id = get_user_clinic_id())
      )
    )
  );

CREATE POLICY "Admins and managers insert revenue"
  ON revenue_records FOR INSERT
  WITH CHECK (
    clinic_location_id IN (
      SELECT id FROM clinic_locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
    AND (get_user_role() = 'ADMIN' OR get_user_role() = 'CLINIC_MANAGER' OR get_user_role() IS NULL)
  );

CREATE POLICY "Admins and managers update revenue"
  ON revenue_records FOR UPDATE
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
    AND (get_user_role() = 'ADMIN' OR get_user_role() = 'CLINIC_MANAGER' OR get_user_role() IS NULL)
  );

CREATE POLICY "Admins and managers delete revenue"
  ON revenue_records FOR DELETE
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
    AND (get_user_role() = 'ADMIN' OR get_user_role() = 'CLINIC_MANAGER' OR get_user_role() IS NULL)
  );

-- =============================================================================
-- WEEKLY_REPORTS - Role-based read
-- =============================================================================
DROP POLICY IF EXISTS "Users can read weekly reports in org" ON weekly_reports;

CREATE POLICY "Admins and managers read weekly reports"
  ON weekly_reports FOR SELECT
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations
      WHERE organization_id IN (SELECT get_user_organization_ids())
      AND (
        get_user_role() = 'ADMIN' OR get_user_role() IS NULL
        OR (get_user_role() = 'CLINIC_MANAGER' AND id = get_user_clinic_id())
      )
    )
  );

-- Weekly reports are typically generated by backend/cron - no user INSERT policy
-- Service role bypasses RLS for seed/automation

-- =============================================================================
-- ACTIVITY_LOG - Use SECURITY DEFINER helper to avoid recursion
-- =============================================================================
DROP POLICY IF EXISTS "Users can read activity in org" ON activity_log;
DROP POLICY IF EXISTS "Users can insert activity" ON activity_log;

CREATE POLICY "Users read activity in org"
  ON activity_log FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users insert activity"
  ON activity_log FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));
