-- ============================================================
-- V4 MIGRATION 005: Content Calendar
-- Replaces localStorage + Supabase content_items with a
-- proper multi-client, role-aware content_posts table
-- ============================================================

CREATE TABLE IF NOT EXISTS content_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id     UUID,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  platform        TEXT NOT NULL DEFAULT 'instagram',
  post_type       TEXT DEFAULT 'image',
  caption         TEXT,
  hashtags        TEXT[],
  media_urls      TEXT[],
  scheduled_date  DATE NOT NULL,
  scheduled_time  TIME,
  status          TEXT NOT NULL DEFAULT 'draft',
  approved_by_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  post_url        TEXT,
  ai_generated    BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER content_posts_updated_at BEFORE UPDATE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_content_posts_client_date ON content_posts(client_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_posts_status_date ON content_posts(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_posts_created_by ON content_posts(created_by_id);

-- RLS
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_posts_select" ON content_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "content_posts_write" ON content_posts FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','director','manager','content_manager')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE content_posts;
