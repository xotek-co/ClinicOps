-- Users table for RBAC (auth users with app roles)
-- id = auth.users.id
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CLINIC_MANAGER', 'STAFF')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  clinic_location_id UUID REFERENCES clinic_locations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link staff records to auth users (for staff login)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(user_id);

-- Appointments: add notes for staff
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Clinic locations: add archived for soft delete
ALTER TABLE clinic_locations ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Activity log for tracking user actions
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activity_log_org ON activity_log(organization_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read_at);

-- Helper: get current user's role and org
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
  user_id UUID,
  org_id UUID,
  user_role TEXT,
  clinic_id UUID
) AS $$
  SELECT id, organization_id, role, clinic_location_id
  FROM users
  WHERE id = auth.uid() AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can read users in org"
  ON users FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can insert their own record (for signup - first org admin)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can insert users in org"
  ON users FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update users in org"
  ON users FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Activity log RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read activity in org"
  ON activity_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activity"
  ON activity_log FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications (mark read)"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Trigger: create user profile on signup (admin creates first org - handled in app)
-- For now: users are created by admin when inviting. We'll add a trigger for first signup.
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-create if user doesn't exist in users table
  -- Admin will create users via /admin/users - this is for edge case
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
