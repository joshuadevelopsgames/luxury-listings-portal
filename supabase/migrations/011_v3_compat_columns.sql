-- ============================================================
-- V4 MIGRATION 011: V3 Compatibility Columns & Missing Tables
-- Adds fields to profiles for firestoreService shim parity,
-- and creates tables that exist in V3 Firestore but not yet
-- in V4 Supabase.
-- ============================================================

-- ─── Profiles: add email + permission/HR columns ───────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS page_permissions TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feature_permissions TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_permissions TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leave_balances JSONB DEFAULT '{"vacation":{"total":15,"used":0,"remaining":15},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_time_off_admin BOOLEAN DEFAULT false;

-- Back-fill email from auth.users for existing rows
UPDATE profiles SET email = lower(u.email)
FROM auth.users u WHERE profiles.id = u.id AND profiles.email IS NULL;

-- Auto-populate email on new signups (update the trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    lower(NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email WHERE profiles.email IS NULL;
  RETURN NEW;
END;
$$;

-- Unique index on email for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ─── Pending Users ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  full_name  TEXT,
  role       TEXT DEFAULT 'team_member',
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER pending_users_updated_at BEFORE UPDATE ON pending_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pending_users_admin" ON pending_users FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director'));

-- ─── Task Requests (delegation inbox) ─────────────────────
CREATE TABLE IF NOT EXISTS task_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  priority         INT DEFAULT 2,
  status           TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_task_id  UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER task_requests_updated_at BEFORE UPDATE ON task_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE task_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_requests_own" ON task_requests;
CREATE POLICY "task_requests_own" ON task_requests FOR ALL TO authenticated USING (true);

-- ─── User Task Archives ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_task_archives (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type      TEXT NOT NULL DEFAULT 'task',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id, type)
);

ALTER TABLE user_task_archives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_archives_own" ON user_task_archives;
CREATE POLICY "task_archives_own" ON user_task_archives FOR ALL TO authenticated USING (true);

-- ─── Smart Filters ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smart_filters (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  filters    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE smart_filters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smart_filters_own" ON smart_filters;
CREATE POLICY "smart_filters_own" ON smart_filters FOR ALL TO authenticated USING (true);

-- ─── Client Messages ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_messages ON client_messages(client_id, created_at);

ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_messages_auth" ON client_messages FOR ALL TO authenticated USING (true);

-- ─── Client Reports ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title      TEXT,
  date       DATE,
  body       TEXT,
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_reports_auth" ON client_reports FOR ALL TO authenticated USING (true);

-- ─── Pending Clients ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_clients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  details    JSONB DEFAULT '{}'::jsonb,
  submitted_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status     TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pending_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pending_clients_auth" ON pending_clients FOR ALL TO authenticated USING (true);

-- ─── Client Contracts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_contracts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title       TEXT,
  value       NUMERIC(12,2),
  start_date  DATE,
  end_date    DATE,
  status      TEXT DEFAULT 'active',
  details     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER client_contracts_updated_at BEFORE UPDATE ON client_contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_contracts_auth" ON client_contracts FOR ALL TO authenticated USING (true);

-- ─── Client Movements (analytics log) ─────────────────────
CREATE TABLE IF NOT EXISTS client_movements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL,
  client_id    TEXT,
  client_name  TEXT,
  performed_by TEXT,
  details      JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_movements ON client_movements(type, created_at DESC);

ALTER TABLE client_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_movements_auth" ON client_movements FOR ALL TO authenticated USING (true);

-- ─── Post Log Monthly (snapshots) ─────────────────────────
CREATE TABLE IF NOT EXISTS post_log_monthly (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year_month   TEXT NOT NULL,
  posts_used   INT DEFAULT 0,
  posts_by_platform JSONB DEFAULT '{}'::jsonb,
  snapshot     JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, year_month)
);

ALTER TABLE post_log_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_log_monthly_auth" ON post_log_monthly FOR ALL TO authenticated USING (true);

-- ─── Content Calendars ────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_calendars (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'My Calendar',
  description TEXT,
  color       TEXT DEFAULT '#3B82F6',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_calendars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_calendars_own" ON content_calendars;
CREATE POLICY "content_calendars_own" ON content_calendars FOR ALL TO authenticated USING (true);

-- ─── Content Items ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calendar_id    UUID REFERENCES content_calendars(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  platform       TEXT,
  status         TEXT DEFAULT 'draft',
  scheduled_date DATE,
  media_urls     TEXT[] DEFAULT '{}',
  tags           TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER content_items_updated_at BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_items_own" ON content_items;
CREATE POLICY "content_items_own" ON content_items FOR ALL TO authenticated USING (true);

-- ─── CRM Data (shared doc) ───────────────────────────────
CREATE TABLE IF NOT EXISTS crm_data (
  id         TEXT PRIMARY KEY DEFAULT 'shared',
  warm_leads JSONB DEFAULT '[]'::jsonb,
  contacted_clients JSONB DEFAULT '[]'::jsonb,
  cold_leads JSONB DEFAULT '[]'::jsonb,
  last_sync_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_custom_locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value      TEXT NOT NULL UNIQUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crm_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_data_auth" ON crm_data FOR ALL TO authenticated USING (true);
CREATE POLICY "crm_custom_locations_auth" ON crm_custom_locations FOR ALL TO authenticated USING (true);

-- ─── Custom Roles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_roles_select" ON custom_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_roles_write" ON custom_roles FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director'));

-- ─── Slack Connections ────────────────────────────────────
CREATE TABLE IF NOT EXISTS slack_connections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  channel_id TEXT,
  webhook_url TEXT,
  connected_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slack_connections_own" ON slack_connections FOR ALL TO authenticated USING (true);

-- ─── Project Requests ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_project_id UUID REFERENCES graphic_projects(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE project_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_requests_own" ON project_requests;
CREATE POLICY "project_requests_own" ON project_requests FOR ALL TO authenticated USING (true);

-- ─── System Config ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_config_select" ON system_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "system_config_write" ON system_config FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director'));

-- ─── Defensive stub: canvases (created in migration 010) ─────────────────────
-- No-op if 010 was applied. Allows canvas_history, canvas_block_comments, and
-- the canvases ALTER TABLE below to succeed even if 010 was skipped.
CREATE TABLE IF NOT EXISTS canvases (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL DEFAULT 'Untitled',
  content    JSONB DEFAULT '[]'::jsonb,
  owner_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_shared  BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

-- ─── Canvas History ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS canvas_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id  UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  blocks     JSONB NOT NULL DEFAULT '[]'::jsonb,
  title      TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canvas_history ON canvas_history(canvas_id, created_at DESC);

ALTER TABLE canvas_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canvas_history_access" ON canvas_history FOR ALL TO authenticated USING (true);

-- ─── Canvas Block Comments ────────────────────────────────
CREATE TABLE IF NOT EXISTS canvas_block_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id  UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  block_id   TEXT NOT NULL,
  comments   JSONB DEFAULT '[]'::jsonb,
  reactions  JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_canvas_block ON canvas_block_comments(canvas_id, block_id);

ALTER TABLE canvas_block_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canvas_block_comments_access" ON canvas_block_comments FOR ALL TO authenticated USING (true);

-- ─── Add shared_with columns to canvases ──────────────────
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📝';
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS shared_with JSONB DEFAULT '[]'::jsonb;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS shared_with_emails TEXT[] DEFAULT '{}';

-- ─── Add leave request history + extra columns ────────────
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS manager_notes TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ─── Add extra client columns for V3 parity ───────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_manager_email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS posts_used INT DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS posts_remaining INT DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS posts_used_by_platform JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS posts_remaining_by_platform JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS package_size INT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS platforms JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS profile_photo TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_name TEXT;

-- ─── Add extra instagram_reports columns ──────────────────
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS year INT;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS month INT;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS post_links JSONB DEFAULT '[]'::jsonb;

-- ─── Realtime subscriptions (idempotent — won't error if already added) ───────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_requests;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_tickets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'time_off_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE time_off_requests;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
