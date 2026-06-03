-- ============================================================
-- MIGRATION 038: Report Templates
-- Shared, reusable Analytics Report templates (theme + section blocks)
-- built in /analytics-template-builder. Templates can be assigned as
-- per-client defaults (assigned_client_ids) so the report wizard
-- pre-selects a client's template when creating a report.
-- ============================================================

CREATE TABLE IF NOT EXISTS report_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL DEFAULT 'Untitled template',
  theme               JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocks              JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Client ids (UUID or legacy Firebase id, stored as text) this template
  -- is the default for. A client should generally appear in at most one.
  assigned_client_ids TEXT[] NOT NULL DEFAULT '{}',
  created_by_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS report_templates_updated_at ON report_templates;
CREATE TRIGGER report_templates_updated_at BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- GIN index so getDefaultTemplateForClient (assigned_client_ids @> ARRAY[id]) is fast.
CREATE INDEX IF NOT EXISTS idx_report_templates_assigned_clients
  ON report_templates USING GIN (assigned_client_ids);

-- RLS: authenticated team reads all templates; elevated roles or the creator
-- may insert/update/delete (mirrors instagram_reports intent, minus client scoping
-- since templates are not owned by a single client).
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_templates_select" ON report_templates;
CREATE POLICY "report_templates_select" ON report_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "report_templates_insert" ON report_templates;
CREATE POLICY "report_templates_insert" ON report_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN (
      'admin','director','manager','content_manager','account_manager','social_media_manager'
    )
    OR created_by_id = auth.uid()
  );

DROP POLICY IF EXISTS "report_templates_update" ON report_templates;
CREATE POLICY "report_templates_update" ON report_templates
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN (
      'admin','director','manager','content_manager','account_manager','social_media_manager'
    )
    OR created_by_id = auth.uid()
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN (
      'admin','director','manager','content_manager','account_manager','social_media_manager'
    )
    OR created_by_id = auth.uid()
  );

DROP POLICY IF EXISTS "report_templates_delete" ON report_templates;
CREATE POLICY "report_templates_delete" ON report_templates
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN (
      'admin','director','manager','content_manager','account_manager','social_media_manager'
    )
    OR created_by_id = auth.uid()
  );
