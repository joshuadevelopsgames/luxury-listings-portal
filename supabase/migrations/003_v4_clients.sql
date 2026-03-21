-- ============================================================
-- V4 MIGRATION 003: Clients & Health
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_number      SERIAL UNIQUE,
  name               TEXT NOT NULL,
  logo_url           TEXT,
  status             TEXT NOT NULL DEFAULT 'active',
  health_status      TEXT NOT NULL DEFAULT 'monitor',
  health_score       INT,
  account_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  platform           TEXT DEFAULT 'instagram',
  posts_per_month    INT,
  instagram_handle   TEXT,
  facebook_page      TEXT,
  notes              TEXT,
  onboarded_at       DATE,
  contract_start     DATE,
  contract_end       DATE,
  monthly_value      NUMERIC(10,2),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS client_health_snapshots (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  score      INT,
  summary    TEXT,
  factors    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_snapshots ON client_health_snapshots(client_id, created_at DESC);

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_write_managers" ON clients FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager'));

CREATE POLICY "health_snapshots_select" ON client_health_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "health_snapshots_write" ON client_health_snapshots FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager','content_manager'));
