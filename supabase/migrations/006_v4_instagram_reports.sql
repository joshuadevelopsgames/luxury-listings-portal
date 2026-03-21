-- ============================================================
-- V4 MIGRATION 006: Instagram Reports
-- Migrates from Firestore-based reports to Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS instagram_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  -- Follower metrics
  followers_start   INT,
  followers_end     INT,
  -- Engagement metrics
  total_reach       INT,
  profile_views     INT,
  impressions       INT,
  likes             INT,
  comments          INT,
  shares            INT,
  saves             INT,
  engagement_rate   NUMERIC(5,2),
  -- Post metrics
  posts_count       INT,
  reels_count       INT,
  stories_count     INT,
  -- Raw OCR / screenshot data
  screenshot_urls   TEXT[],
  raw_ocr_data      JSONB,
  -- Public sharing
  public_link_id    TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 12),
  is_public         BOOLEAN DEFAULT false,
  archived          BOOLEAN DEFAULT false,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER instagram_reports_updated_at BEFORE UPDATE ON instagram_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_instagram_reports_client ON instagram_reports(client_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_reports_public ON instagram_reports(public_link_id) WHERE is_public = true;

-- Engagement events (real-time feed)
CREATE TABLE IF NOT EXISTS engagement_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  actor_name   TEXT,
  actor_handle TEXT,
  post_url     TEXT,
  post_id      UUID REFERENCES content_posts(id) ON DELETE SET NULL,
  message      TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_client ON engagement_events(client_id, occurred_at DESC);

-- RLS
ALTER TABLE instagram_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;

-- Reports: authenticated team reads all; public link bypasses auth (handled in app layer)
CREATE POLICY "instagram_reports_select" ON instagram_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "instagram_reports_write" ON instagram_reports FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','director','manager','content_manager')
  );

CREATE POLICY "engagement_events_select" ON engagement_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "engagement_events_insert" ON engagement_events FOR INSERT TO authenticated WITH CHECK (true);

-- Realtime (live engagement feed)
ALTER PUBLICATION supabase_realtime ADD TABLE engagement_events;
