-- Fix weekly_reports RLS for CLINIC_MANAGER/STAFF: use direct clinic check
-- Also add STAFF role (was missing)
--
-- Root cause: auth trigger creates users with clinic_location_id=NULL before seed runs.
-- Seed's insert failed (duplicate), so manager/staff never got clinic_location_id set.
-- This migration also fixes existing users: assign first org clinic if NULL.

UPDATE public.users u
SET clinic_location_id = (
  SELECT id FROM clinic_locations
  WHERE organization_id = u.organization_id
  ORDER BY name LIMIT 1
)
WHERE u.role IN ('CLINIC_MANAGER', 'STAFF')
  AND u.clinic_location_id IS NULL
  AND u.organization_id IS NOT NULL;

DROP POLICY IF EXISTS "Admins and managers read weekly reports" ON weekly_reports;

CREATE POLICY "Admins and managers read weekly reports"
  ON weekly_reports FOR SELECT
  USING (
    (get_user_role() = 'ADMIN' OR get_user_role() IS NULL)
    AND clinic_location_id IN (
      SELECT id FROM clinic_locations
      WHERE organization_id IN (SELECT get_user_organization_ids())
    )
    OR
    (
      get_user_role() IN ('CLINIC_MANAGER', 'STAFF')
      AND get_user_clinic_id() IS NOT NULL
      AND clinic_location_id = get_user_clinic_id()
    )
  );
