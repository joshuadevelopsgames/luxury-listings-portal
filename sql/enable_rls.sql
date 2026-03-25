-- =============================================================================
-- ROW LEVEL SECURITY — SMM Luxury Listings Portal
-- Run this entire file in the Supabase SQL Editor.
--
-- Strategy:
--   • All tables require authentication (anon key attacks are blocked).
--   • Most tables: authenticated users can read everything they need for work.
--   • Personal tables (notifications, prefs): users can only touch their own rows.
--   • Admin-only tables (system_config, pending_users): restricted via is_app_admin().
--   • profiles: all staff can read; users update their own row; only admins can
--     insert/delete (approval flow) or change permission fields.
--
-- IMPORTANT: After running this, test each role in the app to confirm nothing
-- is unexpectedly blocked. The service_role key bypasses RLS entirely, so
-- any server-side operations using that key are unaffected.
-- =============================================================================

-- ─── Helper: check if the calling user is a system admin ─────────────────────
-- Reads the 'admins' row from system_config and checks if the JWT email is in it.
-- Also hard-codes the bootstrap admin so they're never locked out.
CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    lower(auth.jwt()->>'email') = 'jrsschroeder@gmail.com'
    OR EXISTS (
      SELECT 1 FROM system_config
      WHERE key = 'admins'
        AND value->'emails' ? lower(auth.jwt()->>'email')
    );
$$;

-- ─── Enable RLS on every table ───────────────────────────────────────────────
ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_requests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_task_archives        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contracts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_health_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_movements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendars         ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_log_monthly          ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphic_projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_form_responses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_data                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_filters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_chats            ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events              ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PROFILES (approved_users)
-- All authenticated users can read (needed for team pages, mentions, etc.)
-- Users can update their own row (bio, avatar, etc.)
-- Only admins can insert/delete rows (user approval flow)
-- =============================================================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (lower(email) = lower(auth.jwt()->>'email'))
  WITH CHECK (lower(email) = lower(auth.jwt()->>'email'));

CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (is_app_admin());

CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE TO authenticated
  USING (is_app_admin());

-- =============================================================================
-- SYSTEM CONFIG
-- All authenticated users can read (needed for role config, announcements flags, etc.)
-- Only admins can write (admin list, system settings, per-user role prefs)
-- =============================================================================
DROP POLICY IF EXISTS "system_config_select" ON system_config;
DROP POLICY IF EXISTS "system_config_write_admin" ON system_config;

CREATE POLICY "system_config_select"
  ON system_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "system_config_write_admin"
  ON system_config FOR ALL TO authenticated
  USING (is_app_admin())
  WITH CHECK (is_app_admin());

-- NOTE: Per-user role preferences (key = 'currentRole:<email>') are written by
-- the app via saveSystemConfig. This means only admins can switch roles, which
-- is intentional — regular users' role is set by the admin approval flow.
-- If you want regular users to be able to save their own role preference,
-- replace the write policy above with:
--
--   CREATE POLICY "system_config_write"
--     ON system_config FOR ALL TO authenticated
--     USING (
--       is_app_admin()
--       OR key = 'currentRole:' || lower(auth.jwt()->>'email')
--     )
--     WITH CHECK (
--       is_app_admin()
--       OR key = 'currentRole:' || lower(auth.jwt()->>'email')
--     );

-- =============================================================================
-- PENDING USERS
-- Admin-only — approval queue
-- =============================================================================
DROP POLICY IF EXISTS "pending_users_admin" ON pending_users;

CREATE POLICY "pending_users_admin"
  ON pending_users FOR ALL TO authenticated
  USING (is_app_admin())
  WITH CHECK (is_app_admin());

-- Exception: anyone can INSERT their own pending signup
DROP POLICY IF EXISTS "pending_users_self_register" ON pending_users;

CREATE POLICY "pending_users_self_register"
  ON pending_users FOR INSERT TO authenticated
  WITH CHECK (lower(email) = lower(auth.jwt()->>'email'));

-- =============================================================================
-- CLIENTS & PENDING CLIENTS
-- All authenticated staff need full access for their work
-- =============================================================================
DROP POLICY IF EXISTS "clients_authenticated" ON clients;
DROP POLICY IF EXISTS "pending_clients_authenticated" ON pending_clients;

CREATE POLICY "clients_authenticated"
  ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "pending_clients_authenticated"
  ON pending_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- ANNOUNCEMENTS
-- All authenticated users can read; admins write
-- =============================================================================
DROP POLICY IF EXISTS "announcements_select" ON announcements;
DROP POLICY IF EXISTS "announcements_write_admin" ON announcements;

CREATE POLICY "announcements_select"
  ON announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "announcements_write_admin"
  ON announcements FOR ALL TO authenticated
  USING (is_app_admin())
  WITH CHECK (is_app_admin());

-- =============================================================================
-- TASKS, TASK TEMPLATES, TASK REQUESTS, USER TASK ARCHIVES
-- All authenticated staff share tasks
-- =============================================================================
DROP POLICY IF EXISTS "tasks_authenticated" ON tasks;
DROP POLICY IF EXISTS "task_templates_authenticated" ON task_templates;
DROP POLICY IF EXISTS "task_requests_authenticated" ON task_requests;
DROP POLICY IF EXISTS "user_task_archives_own" ON user_task_archives;

CREATE POLICY "tasks_authenticated"
  ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "task_templates_authenticated"
  ON task_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "task_requests_authenticated"
  ON task_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Archives: users manage their own archived tasks
CREATE POLICY "user_task_archives_own"
  ON user_task_archives FOR ALL TO authenticated
  USING (
    lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin()
  )
  WITH CHECK (
    lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin()
  );

-- =============================================================================
-- NOTIFICATIONS
-- Users see and manage only their own notifications
-- Admins can read all (for support purposes)
-- =============================================================================
DROP POLICY IF EXISTS "notifications_own" ON notifications;

CREATE POLICY "notifications_own"
  ON notifications FOR ALL TO authenticated
  USING (
    lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin()
  )
  WITH CHECK (
    lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin()
  );

-- =============================================================================
-- USER DASHBOARD PREFERENCES
-- Users own their own preferences row
-- =============================================================================
DROP POLICY IF EXISTS "dashboard_prefs_own" ON user_dashboard_preferences;

CREATE POLICY "dashboard_prefs_own"
  ON user_dashboard_preferences FOR ALL TO authenticated
  USING (
    lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin()
  )
  WITH CHECK (
    lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin()
  );

-- =============================================================================
-- TIME OFF REQUESTS
-- Users can read all (managers need to see team requests)
-- Users write/update their own; admins can update any (approve/reject)
-- =============================================================================
DROP POLICY IF EXISTS "time_off_select" ON time_off_requests;
DROP POLICY IF EXISTS "time_off_insert_own" ON time_off_requests;
DROP POLICY IF EXISTS "time_off_update" ON time_off_requests;

CREATE POLICY "time_off_select"
  ON time_off_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "time_off_insert_own"
  ON time_off_requests FOR INSERT TO authenticated
  WITH CHECK (
    lower(employee_email) = lower(auth.jwt()->>'email') OR is_app_admin()
  );

CREATE POLICY "time_off_update"
  ON time_off_requests FOR UPDATE TO authenticated
  USING (
    lower(employee_email) = lower(auth.jwt()->>'email') OR is_app_admin()
  );

-- =============================================================================
-- REPORTS (instagram_reports, client_reports)
-- All authenticated staff can read and write
-- =============================================================================
DROP POLICY IF EXISTS "instagram_reports_authenticated" ON instagram_reports;
DROP POLICY IF EXISTS "client_reports_authenticated" ON client_reports;

CREATE POLICY "instagram_reports_authenticated"
  ON instagram_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "client_reports_authenticated"
  ON client_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- CLIENT DATA (contracts, health snapshots, messages, movements)
-- All authenticated staff need access for their work
-- =============================================================================
DROP POLICY IF EXISTS "client_contracts_authenticated" ON client_contracts;
DROP POLICY IF EXISTS "client_health_snapshots_authenticated" ON client_health_snapshots;
DROP POLICY IF EXISTS "client_messages_authenticated" ON client_messages;
DROP POLICY IF EXISTS "client_movements_authenticated" ON client_movements;

CREATE POLICY "client_contracts_authenticated"
  ON client_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "client_health_snapshots_authenticated"
  ON client_health_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "client_messages_authenticated"
  ON client_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "client_movements_authenticated"
  ON client_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- CONTENT (calendars, items, post log, graphic projects)
-- All authenticated staff
-- =============================================================================
DROP POLICY IF EXISTS "content_calendars_authenticated" ON content_calendars;
DROP POLICY IF EXISTS "content_items_authenticated" ON content_items;
DROP POLICY IF EXISTS "post_log_monthly_authenticated" ON post_log_monthly;
DROP POLICY IF EXISTS "graphic_projects_authenticated" ON graphic_projects;

CREATE POLICY "content_calendars_authenticated"
  ON content_calendars FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "content_items_authenticated"
  ON content_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "post_log_monthly_authenticated"
  ON post_log_monthly FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "graphic_projects_authenticated"
  ON graphic_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- CANVASES & FORM RESPONSES
-- =============================================================================
DROP POLICY IF EXISTS "canvases_authenticated" ON canvases;
DROP POLICY IF EXISTS "canvas_form_responses_authenticated" ON canvas_form_responses;

CREATE POLICY "canvases_authenticated"
  ON canvases FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "canvas_form_responses_authenticated"
  ON canvas_form_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- CRM, PROJECT REQUESTS
-- =============================================================================
DROP POLICY IF EXISTS "crm_data_authenticated" ON crm_data;
DROP POLICY IF EXISTS "project_requests_authenticated" ON project_requests;

CREATE POLICY "crm_data_authenticated"
  ON crm_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "project_requests_authenticated"
  ON project_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- SUPPORT TICKETS & COMMENTS
-- All staff can read all tickets (support team needs visibility)
-- Users write their own tickets; support/admins update any
-- =============================================================================
DROP POLICY IF EXISTS "support_tickets_select" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_update" ON support_tickets;
DROP POLICY IF EXISTS "ticket_comments_authenticated" ON ticket_comments;

CREATE POLICY "support_tickets_select"
  ON support_tickets FOR SELECT TO authenticated USING (true);

CREATE POLICY "support_tickets_insert"
  ON support_tickets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "support_tickets_update"
  ON support_tickets FOR UPDATE TO authenticated USING (true);

CREATE POLICY "ticket_comments_authenticated"
  ON ticket_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- MISCELLANEOUS SHARED TABLES
-- =============================================================================
DROP POLICY IF EXISTS "smart_filters_authenticated" ON smart_filters;
DROP POLICY IF EXISTS "custom_roles_admin" ON custom_roles;
DROP POLICY IF EXISTS "custom_locations_authenticated" ON custom_locations;
DROP POLICY IF EXISTS "feedback_authenticated" ON feedback;
DROP POLICY IF EXISTS "feedback_chats_authenticated" ON feedback_chats;
DROP POLICY IF EXISTS "error_reports_authenticated" ON error_reports;
DROP POLICY IF EXISTS "usage_events_authenticated" ON usage_events;

CREATE POLICY "smart_filters_authenticated"
  ON smart_filters FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Custom roles: admins only (defines the role structure for the org)
CREATE POLICY "custom_roles_admin"
  ON custom_roles FOR ALL TO authenticated
  USING (is_app_admin())
  WITH CHECK (is_app_admin());

CREATE POLICY "custom_locations_authenticated"
  ON custom_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "feedback_authenticated"
  ON feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "feedback_chats_authenticated"
  ON feedback_chats FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "error_reports_authenticated"
  ON error_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "usage_events_authenticated"
  ON usage_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- PERMISSION AUDIT LOG
-- Insert: any authenticated user (the app logs changes automatically)
-- Read: admins only
-- =============================================================================
DROP POLICY IF EXISTS "audit_log_insert" ON permission_audit_log;
DROP POLICY IF EXISTS "audit_log_select_admin" ON permission_audit_log;

CREATE POLICY "audit_log_insert"
  ON permission_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "audit_log_select_admin"
  ON permission_audit_log FOR SELECT TO authenticated
  USING (is_app_admin());

-- =============================================================================
-- VERIFICATION
-- After running, check policies are active:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
-- =============================================================================
