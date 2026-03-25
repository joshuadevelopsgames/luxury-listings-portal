-- ============================================================
-- MIGRATION 012: V3 Compatibility — Missing Tables & Columns
-- Adds all tables that exist in Firestore but not yet in Supabase,
-- plus email-based lookup columns needed for the V3 service layer.
-- ============================================================

-- ─── Defensive stubs: tables created in migration 010 ────────────────────────
-- These CREATE TABLE IF NOT EXISTS statements are no-ops when migration 010 has
-- already been applied. They exist so 012 is fully self-contained if 010 was
-- skipped or rolled back (e.g. by a publication error in a prior session).
-- Only the minimum columns are listed here; full column sets live in 010.

CREATE TABLE IF NOT EXISTS support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'feedback',
  title      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- feedback_chats depends on feedback — create feedback first (above)
CREATE TABLE IF NOT EXISTS feedback_chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE feedback_chats ENABLE ROW LEVEL SECURITY;

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

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS task_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- ─── Email columns on existing tables (V3 uses email, not UUID) ──────────────

-- notifications: add user_email for V3-style email lookups
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS count INT DEFAULT 1;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS task_request_id TEXT;
CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email);

-- tasks: add V3-style email columns (V3 stores emails as strings, not UUIDs)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT;   -- email
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by TEXT;   -- email
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_id_legacy TEXT; -- Firestore clientId string
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_request_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_date TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS post_date TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS post_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);

-- time_off_requests: add V3-style email columns
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS leave_type TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS days_requested NUMERIC(5,2);
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS reviewed_by_email TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS requester_calendar_event_id TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_time_off_user_email ON time_off_requests(user_email);

-- profiles: additional V3 fields
-- email is also added by migration 011; include here so 012 is self-contained
-- if 011 was rolled back by an ALTER PUBLICATION error.
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
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '["content_director"]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS uid TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_workspace_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meta_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meta_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS page_permissions TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feature_permissions TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_permissions TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leave_balances JSONB DEFAULT '{"vacation":{"total":15,"used":0,"remaining":15},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_time_off_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- Unique index on email (safe to run whether or not 011 already created it)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
-- Back-fill email from auth.users for any existing rows that don't have it yet
UPDATE profiles SET email = lower(u.email)
FROM auth.users u WHERE profiles.id = u.id AND profiles.email IS NULL;
-- Update the new-user trigger to always populate email (idempotent)
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
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);
  RETURN NEW;
END;
$$;

-- clients: additional V3 fields
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_name TEXT; -- V3 uses clientName
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_manager TEXT; -- email
ALTER TABLE clients ADD COLUMN IF NOT EXISTS package_size INT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS posts_used INT DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS posts_remaining INT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS posts_used_by_platform JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS posts_remaining_by_platform JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS platforms JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brokerage TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_value NUMERIC(10,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS additional_platforms TEXT[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- graphic_projects: V3 field additions
ALTER TABLE graphic_projects ADD COLUMN IF NOT EXISTS requested_by_email TEXT;
ALTER TABLE graphic_projects ADD COLUMN IF NOT EXISTS assigned_to_email TEXT;
ALTER TABLE graphic_projects ADD COLUMN IF NOT EXISTS client_id_legacy TEXT;
ALTER TABLE graphic_projects ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE graphic_projects ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE graphic_projects ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- support_tickets: V3 field additions
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_email ON support_tickets(user_email);

-- feedback: V3 field additions
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_feedback_user_email ON feedback(user_email);

-- canvases: V3 field additions
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS user_id_legacy TEXT; -- Firestore userId (auth UID)
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS shared_with JSONB DEFAULT '[]'::jsonb;
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;

-- announcements: V3 field additions
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by_email TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS link TEXT;

-- instagram_reports: V3 field additions
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS user_id_legacy TEXT; -- Firebase auth UID
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS client_id_legacy TEXT; -- Firestore clientId
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS date_range TEXT;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS post_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS metrics JSONB;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS report_type TEXT; -- monthly | quarterly | yearly
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS source_report_ids TEXT[];
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS quarterly_breakdown JSONB;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS public_link_id TEXT UNIQUE;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS year INT;
ALTER TABLE instagram_reports ADD COLUMN IF NOT EXISTS month INT;
CREATE INDEX IF NOT EXISTS idx_instagram_reports_user_email ON instagram_reports(user_email);
CREATE INDEX IF NOT EXISTS idx_instagram_reports_public_link ON instagram_reports(public_link_id);
CREATE INDEX IF NOT EXISTS idx_instagram_reports_client_legacy ON instagram_reports(client_id_legacy);

-- content_calendars: make sure user_email exists and add client scoping
ALTER TABLE content_calendars ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE content_calendars ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE content_calendars ADD COLUMN IF NOT EXISTS description TEXT;
CREATE INDEX IF NOT EXISTS idx_content_calendars_user_email ON content_calendars(user_email);

-- content_items: ensure V3 fields
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS calendar_id TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'image';
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'instagram';
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_content_items_user_email ON content_items(user_email);

-- ─── Pending Users ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  name       TEXT,
  role       TEXT DEFAULT 'team_member',
  status     TEXT NOT NULL DEFAULT 'pending',
  meta       JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pending_users_admin" ON pending_users;
CREATE POLICY "pending_users_admin" ON pending_users FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director'));

-- ─── Task Requests ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_email TEXT NOT NULL,
  to_user_email   TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  priority        TEXT DEFAULT 'medium',
  due_date        TEXT,
  due_time        TEXT,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | rejected
  rejection_reason TEXT,
  task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
-- If 011 created this table with UUID FK columns instead, add the email columns now
ALTER TABLE task_requests ADD COLUMN IF NOT EXISTS from_user_email TEXT;
ALTER TABLE task_requests ADD COLUMN IF NOT EXISTS to_user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_task_requests_from ON task_requests(from_user_email);
CREATE INDEX IF NOT EXISTS idx_task_requests_to ON task_requests(to_user_email);
ALTER TABLE task_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_requests_access" ON task_requests;
CREATE POLICY "task_requests_access" ON task_requests FOR ALL TO authenticated USING (true);

-- ─── User Task Archives ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_task_archives (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT NOT NULL,
  ref_type    TEXT NOT NULL, -- 'task' | 'request'
  ref_id      TEXT NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_email, ref_type, ref_id)
);
-- If 011 created this table with UUID FK columns instead, add the email columns now
ALTER TABLE user_task_archives ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE user_task_archives ADD COLUMN IF NOT EXISTS ref_type TEXT;
ALTER TABLE user_task_archives ADD COLUMN IF NOT EXISTS ref_id TEXT;
CREATE INDEX IF NOT EXISTS idx_user_task_archives ON user_task_archives(user_email, ref_type);
ALTER TABLE user_task_archives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_task_archives_own" ON user_task_archives;
CREATE POLICY "user_task_archives_own" ON user_task_archives FOR ALL TO authenticated USING (true);

-- ─── Client Messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   TEXT NOT NULL,  -- Firestore clientId (or UUID)
  from_email  TEXT,
  content     TEXT,
  type        TEXT DEFAULT 'note',
  meta        JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_messages_client ON client_messages(client_id);
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_messages_access" ON client_messages;
CREATE POLICY "client_messages_access" ON client_messages FOR ALL TO authenticated USING (true);

-- ─── Client Reports (monthly) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   TEXT NOT NULL,
  month       TEXT,           -- e.g. '2025-03'
  data        JSONB DEFAULT '{}'::jsonb,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_reports_client ON client_reports(client_id);
ALTER TABLE client_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_reports_access" ON client_reports;
CREATE POLICY "client_reports_access" ON client_reports FOR ALL TO authenticated USING (true);

-- ─── Pending Clients ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  brokerage    TEXT,
  notes        TEXT,
  submitted_by TEXT,
  status       TEXT DEFAULT 'pending',
  meta         JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE pending_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pending_clients_access" ON pending_clients;
CREATE POLICY "pending_clients_access" ON pending_clients FOR ALL TO authenticated USING (true);

-- ─── Client Contracts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_contracts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    TEXT NOT NULL,
  title        TEXT,
  type         TEXT,
  status       TEXT DEFAULT 'active',
  start_date   DATE,
  end_date     DATE,
  value        NUMERIC(10,2),
  file_url     TEXT,
  notes        TEXT,
  signed_by    TEXT,
  signed_at    TIMESTAMPTZ,
  meta         JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_contracts_client ON client_contracts(client_id);
ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_contracts_access" ON client_contracts;
CREATE POLICY "client_contracts_access" ON client_contracts FOR ALL TO authenticated USING (true);

-- ─── Client Movements (audit log for client changes) ─────────────────────────
CREATE TABLE IF NOT EXISTS client_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     TEXT NOT NULL,
  client_name   TEXT,
  event_type    TEXT NOT NULL, -- 'client_added' | 'client_reassigned' | 'contract_value_increased' etc.
  performed_by  TEXT,
  data          JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_movements_client ON client_movements(client_id, created_at DESC);
ALTER TABLE client_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_movements_access" ON client_movements;
CREATE POLICY "client_movements_access" ON client_movements FOR ALL TO authenticated USING (true);

-- ─── CRM Data (single-row config doc for kanban data) ─────────────────────────
CREATE TABLE IF NOT EXISTS crm_data (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warm_leads      JSONB DEFAULT '[]'::jsonb,
  contacted_clients JSONB DEFAULT '[]'::jsonb,
  cold_leads      JSONB DEFAULT '[]'::jsonb,
  last_sync_time  TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);
-- Insert a single row on first use
INSERT INTO crm_data (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;
ALTER TABLE crm_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_data_access" ON crm_data;
CREATE POLICY "crm_data_access" ON crm_data FOR ALL TO authenticated USING (true);

-- ─── Custom Locations (for CRM forms) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value       TEXT NOT NULL UNIQUE,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE custom_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_locations_access" ON custom_locations;
CREATE POLICY "custom_locations_access" ON custom_locations FOR ALL TO authenticated USING (true);

-- ─── Smart Filters (saved task filters per user) ──────────────────────────────
CREATE TABLE IF NOT EXISTS smart_filters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT NOT NULL,
  name        TEXT NOT NULL,
  filters     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
-- If 011 created this table with user_id UUID instead, add the email column now
ALTER TABLE smart_filters ADD COLUMN IF NOT EXISTS user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_smart_filters_user ON smart_filters(user_email);
ALTER TABLE smart_filters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smart_filters_own" ON smart_filters;
CREATE POLICY "smart_filters_own" ON smart_filters FOR ALL TO authenticated USING (true);

-- ─── System Config (key-value store) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
  key         TEXT PRIMARY KEY,
  value       JSONB,
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_config_read" ON system_config;
CREATE POLICY "system_config_read" ON system_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "system_config_write" ON system_config;
CREATE POLICY "system_config_write" ON system_config FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director'));

-- ─── Post Log Monthly (monthly post history snapshots per client) ─────────────
CREATE TABLE IF NOT EXISTS post_log_monthly (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     TEXT NOT NULL,
  year_month    TEXT NOT NULL,  -- e.g. '2025-03'
  posts_logged  INT DEFAULT 0,
  client_name   TEXT,
  posts_by_platform JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, year_month)
);
CREATE INDEX IF NOT EXISTS idx_post_log_client ON post_log_monthly(client_id, year_month DESC);
ALTER TABLE post_log_monthly ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_log_access" ON post_log_monthly;
CREATE POLICY "post_log_access" ON post_log_monthly FOR ALL TO authenticated USING (true);

-- ─── Usage Events (analytics) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT,
  event_type  TEXT NOT NULL,
  data        JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(event_type, created_at DESC);
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_events_insert" ON usage_events;
CREATE POLICY "usage_events_insert" ON usage_events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "usage_events_select" ON usage_events;
CREATE POLICY "usage_events_select" ON usage_events FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director'));

-- ─── Canvas Form Responses ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canvas_form_responses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id        TEXT NOT NULL,
  block_id         TEXT NOT NULL,
  respondent_email TEXT,
  respondent_name  TEXT,
  answers          JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_canvas_form_responses ON canvas_form_responses(canvas_id, block_id);
ALTER TABLE canvas_form_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "canvas_form_responses_access" ON canvas_form_responses;
CREATE POLICY "canvas_form_responses_access" ON canvas_form_responses FOR ALL TO authenticated USING (true);

-- ─── Project Requests (design project requests) ───────────────────────────────
CREATE TABLE IF NOT EXISTS project_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_email  TEXT NOT NULL,
  to_user_email    TEXT,
  title            TEXT NOT NULL,
  description      TEXT,
  type             TEXT,
  client_id        TEXT,
  due_date         TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  project_id       UUID REFERENCES graphic_projects(id) ON DELETE SET NULL,
  meta             JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
-- If 011 created this table with UUID FK columns instead, add the email columns now
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS from_user_email TEXT;
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS to_user_email TEXT;
CREATE INDEX IF NOT EXISTS idx_project_requests_from ON project_requests(from_user_email);
ALTER TABLE project_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_requests_access" ON project_requests;
CREATE POLICY "project_requests_access" ON project_requests FOR ALL TO authenticated USING (true);

-- ─── Custom Roles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  permissions JSONB DEFAULT '{}'::jsonb,
  page_permissions TEXT[] DEFAULT '{}',
  feature_permissions TEXT[] DEFAULT '{}',
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_roles_read" ON custom_roles;
CREATE POLICY "custom_roles_read" ON custom_roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "custom_roles_write" ON custom_roles;
CREATE POLICY "custom_roles_write" ON custom_roles FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director'));

-- ─── Feedback Chats (full chat sessions, not just messages) ──────────────────
-- Re-create feedback_chats as proper chat session table (V3 model differs from V4)
-- In V3: feedback_chats are standalone chat sessions (not sub-messages of feedback)
ALTER TABLE feedback_chats ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE feedback_chats ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE feedback_chats ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE feedback_chats ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE feedback_chats ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE feedback_chats ADD COLUMN IF NOT EXISTS user_last_read_at TIMESTAMPTZ;
ALTER TABLE feedback_chats ADD COLUMN IF NOT EXISTS admin_last_read_at TIMESTAMPTZ;
ALTER TABLE feedback_chats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_feedback_chats_user_email ON feedback_chats(user_email);

-- ─── Task Templates: V3 additions ─────────────────────────────────────────────
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS shared_with TEXT[] DEFAULT '{}';
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Enable realtime for key tables
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pending_users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pending_users;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_requests;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'client_movements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_movements;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'content_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE content_items;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'content_calendars') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE content_calendars;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'canvases') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE canvases;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feedback_chats') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE feedback_chats;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'custom_roles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE custom_roles;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
