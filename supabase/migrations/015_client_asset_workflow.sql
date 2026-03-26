-- ============================================================
-- V4 MIGRATION 015: Client asset workflow foundation
-- Asset folders, listing links, asset scoring, post comments,
-- and simple client approval access records.
-- ============================================================

CREATE TABLE IF NOT EXISTS client_listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  listing_url         TEXT NOT NULL,
  source_domain       TEXT,
  title               TEXT,
  description         TEXT,
  address             TEXT,
  price               TEXT,
  beds                TEXT,
  baths               TEXT,
  square_feet         TEXT,
  raw_payload         JSONB DEFAULT '{}'::jsonb,
  created_by_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER client_listings_updated_at BEFORE UPDATE ON client_listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_client_listings_client ON client_listings(client_id, created_at DESC);

ALTER TABLE client_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_listings_select" ON client_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "client_listings_write" ON client_listings FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','director','manager','content_manager','social_media_manager')
  );

CREATE TABLE IF NOT EXISTS client_asset_folders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  listing_id          UUID REFERENCES client_listings(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  notes               TEXT,
  created_by_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER client_asset_folders_updated_at BEFORE UPDATE ON client_asset_folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_client_asset_folders_client ON client_asset_folders(client_id, created_at DESC);

ALTER TABLE client_asset_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_asset_folders_select" ON client_asset_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "client_asset_folders_write" ON client_asset_folders FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','director','manager','content_manager','social_media_manager')
  );

CREATE TABLE IF NOT EXISTS client_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  folder_id           UUID NOT NULL REFERENCES client_asset_folders(id) ON DELETE CASCADE,
  listing_id          UUID REFERENCES client_listings(id) ON DELETE SET NULL,
  file_name           TEXT,
  file_path           TEXT NOT NULL,
  file_url            TEXT NOT NULL,
  media_type          TEXT NOT NULL DEFAULT 'image',
  width               INT,
  height              INT,
  ai_score            NUMERIC(5,2) DEFAULT 0,
  score_flags         JSONB DEFAULT '{}'::jsonb,
  uploaded_by_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_assets_folder ON client_assets(folder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_assets_client ON client_assets(client_id, created_at DESC);

ALTER TABLE client_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_assets_select" ON client_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "client_assets_write" ON client_assets FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','director','manager','content_manager','social_media_manager')
  );

CREATE TABLE IF NOT EXISTS content_post_comments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  author_email        TEXT,
  body                TEXT NOT NULL,
  is_internal         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_post_comments_post ON content_post_comments(post_id, created_at ASC);

ALTER TABLE content_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_post_comments_select" ON content_post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "content_post_comments_write" ON content_post_comments FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','director','manager','content_manager','social_media_manager')
  );

CREATE TABLE IF NOT EXISTS client_approval_access (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  portal_slug         TEXT NOT NULL UNIQUE,
  passcode            TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  last_login_at       TIMESTAMPTZ,
  created_by_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER client_approval_access_updated_at BEFORE UPDATE ON client_approval_access
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_client_approval_access_client ON client_approval_access(client_id);

ALTER TABLE client_approval_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_approval_access_select" ON client_approval_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "client_approval_access_write" ON client_approval_access FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','director','manager','content_manager')
  );
