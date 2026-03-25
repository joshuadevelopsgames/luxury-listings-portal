-- ============================================================
-- MIGRATION 013: Tables from 010 that were never applied
-- posting_packages, user_dashboard_preferences
-- Safe to re-run (CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS)
-- ============================================================

-- ─── Posting Packages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS posting_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year_month      TEXT NOT NULL,           -- e.g. '2026-03'
  posts_per_month INT NOT NULL DEFAULT 12,
  posts_used      INT NOT NULL DEFAULT 0,
  posts_remaining INT GENERATED ALWAYS AS (posts_per_month - posts_used) STORED,
  posts_by_platform JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, year_month)
);

CREATE OR REPLACE FUNCTION set_updated_at_posting_packages()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'posting_packages_updated_at'
  ) THEN
    CREATE TRIGGER posting_packages_updated_at
      BEFORE UPDATE ON posting_packages
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE posting_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posting_packages_select" ON posting_packages;
CREATE POLICY "posting_packages_select" ON posting_packages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "posting_packages_write" ON posting_packages;
CREATE POLICY "posting_packages_write" ON posting_packages
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','director','manager','content_manager')
  );

-- ─── User Dashboard Preferences ─────────────────────────────
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  widget_order   TEXT[] DEFAULT '{}',
  hidden_widgets TEXT[] DEFAULT '{}',
  layout         JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'dashboard_prefs_updated_at'
  ) THEN
    CREATE TRIGGER dashboard_prefs_updated_at
      BEFORE UPDATE ON user_dashboard_preferences
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_prefs_own" ON user_dashboard_preferences;
CREATE POLICY "dashboard_prefs_own" ON user_dashboard_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
