-- ============================================================
-- V4 MIGRATION 008: Team, HR, Design Projects, Notifications
-- ============================================================

-- ─── Graphic / Design Projects ───────────────────────────────
CREATE TABLE IF NOT EXISTS graphic_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT,
  status          TEXT NOT NULL DEFAULT 'requested',
  requested_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date        DATE,
  delivered_at    TIMESTAMPTZ,
  asset_urls      TEXT[],
  feedback        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER graphic_projects_updated_at BEFORE UPDATE ON graphic_projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_graphic_projects_assignee ON graphic_projects(assigned_to_id, status);

ALTER TABLE graphic_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "graphic_projects_select" ON graphic_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "graphic_projects_write" ON graphic_projects FOR ALL TO authenticated
  USING (
    assigned_to_id = auth.uid()
    OR requested_by_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager','graphic_designer')
  );

-- ─── Time Off Requests ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_off_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  reason      TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_off_user ON time_off_requests(user_id, start_date);

ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_off_own" ON time_off_requests FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','hr_manager')
  );

-- ─── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  client_id  UUID REFERENCES clients(id) ON DELETE SET NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
