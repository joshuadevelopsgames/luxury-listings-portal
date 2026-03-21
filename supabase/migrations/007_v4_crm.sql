-- ============================================================
-- V4 MIGRATION 007: CRM — Leads & Pipeline
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  company             TEXT,
  email               TEXT,
  phone               TEXT,
  source              TEXT,
  status              TEXT NOT NULL DEFAULT 'new',
  temperature         TEXT DEFAULT 'warm',
  score               INT DEFAULT 50,
  owner_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  converted_at        TIMESTAMPTZ,
  notes               TEXT,
  last_contact_at     TIMESTAMPTZ,
  next_follow_up_at   DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(next_follow_up_at) WHERE status NOT IN ('won','lost','converted');

CREATE TABLE IF NOT EXISTS deals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  value       NUMERIC(10,2),
  stage       TEXT NOT NULL DEFAULT 'qualification',
  probability INT DEFAULT 50,
  owner_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  close_date  DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage, close_date);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals(owner_id, stage);

-- Interaction timeline
CREATE TABLE IF NOT EXISTS lead_interactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type       TEXT NOT NULL, -- email | call | meeting | note | task
  subject    TEXT,
  body       TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_lead ON lead_interactions(lead_id, occurred_at DESC);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads_write" ON leads FOR ALL TO authenticated
  USING (
    owner_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager','sales_manager')
  );

CREATE POLICY "deals_select" ON deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "deals_write" ON deals FOR ALL TO authenticated
  USING (
    owner_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager','sales_manager')
  );

CREATE POLICY "interactions_select" ON lead_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "interactions_write" ON lead_interactions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager'));
