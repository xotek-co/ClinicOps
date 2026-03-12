-- Appointment workflow enhancements
-- Add missing columns for appointments, clinic_locations, users

-- clinic_locations: add archived if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_locations' AND column_name = 'archived'
  ) THEN
    ALTER TABLE clinic_locations ADD COLUMN archived BOOLEAN DEFAULT false;
  END IF;
END $$;

-- appointments: add notes if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE appointments ADD COLUMN notes TEXT;
  END IF;
END $$;

-- appointments: add organization_id if not exists (denormalized for easier querying)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    -- Backfill from clinic_locations
    UPDATE appointments a
    SET organization_id = cl.organization_id
    FROM clinic_locations cl
    WHERE a.clinic_location_id = cl.id AND a.organization_id IS NULL;
  END IF;
END $$;

-- appointments: add created_by if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE appointments ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- users: add staff_id for "My Schedule" linking (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE users ADD COLUMN staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_organization ON appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
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
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert notifications for org" ON notifications;
CREATE POLICY "Users insert notifications for org"
  ON notifications FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_organization_ids())
  );
