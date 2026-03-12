-- Row Level Security Policies
-- Users can only access data within their organization

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations: users can read their orgs
CREATE POLICY "Users can read own organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT get_user_organization_ids()));

-- Organization users: users can read their org memberships
CREATE POLICY "Users can read own org memberships"
  ON organization_users FOR SELECT
  USING (user_id = auth.uid() OR organization_id IN (SELECT get_user_organization_ids()));

-- Clinic locations: org-scoped
CREATE POLICY "Users can read clinic locations in org"
  ON clinic_locations FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can insert clinic locations in org"
  ON clinic_locations FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can update clinic locations in org"
  ON clinic_locations FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Staff: org-scoped
CREATE POLICY "Users can read staff in org"
  ON staff FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can manage staff in org"
  ON staff FOR ALL
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Patients: org-scoped
CREATE POLICY "Users can read patients in org"
  ON patients FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can manage patients in org"
  ON patients FOR ALL
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Services: org-scoped
CREATE POLICY "Users can read services in org"
  ON services FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

CREATE POLICY "Users can manage services in org"
  ON services FOR ALL
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Appointments: via clinic (which belongs to org)
CREATE POLICY "Users can read appointments in org"
  ON appointments FOR SELECT
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

CREATE POLICY "Users can manage appointments in org"
  ON appointments FOR ALL
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

-- Revenue records: via clinic
CREATE POLICY "Users can read revenue in org"
  ON revenue_records FOR SELECT
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

-- Weekly reports: via clinic
CREATE POLICY "Users can read weekly reports in org"
  ON weekly_reports FOR SELECT
  USING (
    clinic_location_id IN (
      SELECT id FROM clinic_locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

-- For demo/seed: Allow service role to bypass RLS (use service key in seed script)
-- Anon key will use RLS. For local dev without auth, we need to allow anon read.
-- Add policy for unauthenticated demo (optional - remove in production):
CREATE POLICY "Allow anon read for demo"
  ON organizations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read clinic_locations"
  ON clinic_locations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read staff"
  ON staff FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read patients"
  ON patients FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read services"
  ON services FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read appointments"
  ON appointments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read revenue_records"
  ON revenue_records FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read weekly_reports"
  ON weekly_reports FOR SELECT
  TO anon
  USING (true);
