-- ============================================================
-- MIGRATION 039: Templated Instagram reports
-- Adds the chosen template reference + a self-contained snapshot to each
-- report so its public view renders through the selected template and stays
-- stable even if the template is later edited or deleted.
--
-- NOTE: get_instagram_report_by_public_link (migration 024) is
-- `RETURNS SETOF instagram_reports ... SELECT *`, so it returns these new
-- columns automatically — no function change required.
-- ============================================================

ALTER TABLE instagram_reports
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL;

ALTER TABLE instagram_reports
  ADD COLUMN IF NOT EXISTS template JSONB;
