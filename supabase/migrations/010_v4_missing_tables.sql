-- ============================================================
-- V4 MIGRATION 010: Missing tables for full V3 parity
-- Support tickets, feedback, canvases, posting packages,
-- system config, employees, audit log, etc.
-- ============================================================

-- ─── Support Tickets ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT DEFAULT 'general',
  priority      TEXT DEFAULT 'medium',
  status        TEXT NOT NULL DEFAULT 'open',
  assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to_id, status);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets_own" ON support_tickets FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','it_admin')
  );

-- ─── Ticket Comments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments ON ticket_comments(ticket_id, created_at);

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_comments_access" ON ticket_comments FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR ticket_id IN (
      SELECT id FROM support_tickets
      WHERE user_id = auth.uid()
        OR assigned_to_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','it_admin')
    )
  );

-- ─── Feedback & Bug Reports ─────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'bug',  -- bug | feature | feedback
  title       TEXT NOT NULL,
  description TEXT,
  priority    TEXT DEFAULT 'medium',
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER feedback_updated_at BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_own_or_admin" ON feedback FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director')
  );

-- ─── Feedback Chat Messages ─────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback_chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_chats_access" ON feedback_chats FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director')
  );

-- ─── Canvases / Workspaces ──────────────────────────────────
CREATE TABLE IF NOT EXISTS canvases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL DEFAULT 'Untitled',
  content     JSONB DEFAULT '[]'::jsonb,
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_shared   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER canvases_updated_at BEFORE UPDATE ON canvases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "canvases_own_or_shared" ON canvases FOR ALL TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_shared = true
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director')
  );

-- ─── Posting Packages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS posting_packages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year_month     TEXT NOT NULL,           -- e.g. '2026-03'
  posts_per_month INT NOT NULL DEFAULT 12,
  posts_used     INT NOT NULL DEFAULT 0,
  posts_remaining INT GENERATED ALWAYS AS (posts_per_month - posts_used) STORED,
  posts_by_platform JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, year_month)
);

CREATE TRIGGER posting_packages_updated_at BEFORE UPDATE ON posting_packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE posting_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posting_packages_select" ON posting_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "posting_packages_write" ON posting_packages FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','director','manager','content_manager')
  );

-- ─── Resources ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general',
  url         TEXT,
  file_url    TEXT,
  icon        TEXT,
  sort_order  INT DEFAULT 0,
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER resources_updated_at BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources_select" ON resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "resources_write" ON resources FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director')
  );

-- ─── Announcements ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  priority    TEXT DEFAULT 'normal',
  target_roles TEXT[] DEFAULT '{}',
  is_active   BOOLEAN DEFAULT true,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select" ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_write" ON announcements FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director')
  );

-- ─── Error Reports ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  error_message TEXT,
  error_stack  TEXT,
  url          TEXT,
  console_logs TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "error_reports_insert" ON error_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "error_reports_select" ON error_reports FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director')
  );

-- ─── User Dashboard Preferences ─────────────────────────────
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  widget_order TEXT[] DEFAULT '{}',
  hidden_widgets TEXT[] DEFAULT '{}',
  layout      JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER dashboard_prefs_updated_at BEFORE UPDATE ON user_dashboard_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_prefs_own" ON user_dashboard_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ─── Task Templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  priority    INT DEFAULT 2,
  source      TEXT DEFAULT 'task',
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_templates_select" ON task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_templates_write" ON task_templates FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director','manager')
  );

-- ─── Audit Log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin" ON audit_log FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','director')
  );
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
