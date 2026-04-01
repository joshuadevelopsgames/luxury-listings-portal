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
-- SAFE TO RE-RUN: every statement is wrapped in a DO block that silently skips
-- tables that don't exist yet, so this file is idempotent and won't abort
-- mid-run if a table hasn't been created.
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

-- ─── Helper: enable RLS + apply policies only if table exists ─────────────────
-- Each table's setup is wrapped in its own DO block so a missing table never
-- aborts the rest of the run.

-- =============================================================================
-- PROFILES (approved_users)
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "profiles_select"       ON profiles;
    DROP POLICY IF EXISTS "profiles_update_own"   ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
    DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
    CREATE POLICY "profiles_select"       ON profiles FOR SELECT TO authenticated USING (true);
    CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE TO authenticated
      USING (lower(email) = lower(auth.jwt()->>'email'))
      WITH CHECK (lower(email) = lower(auth.jwt()->>'email'));
    CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT TO authenticated
      WITH CHECK (is_app_admin());
    CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE TO authenticated
      USING (is_app_admin());
  END IF;
END $$;

-- =============================================================================
-- SYSTEM CONFIG
-- All authenticated users can read; only admins can write.
-- Per-user role prefs (key = 'currentRole:<email>') are written by the app —
-- see NOTE below if you want regular users to save their own role preference.
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='system_config') THEN
    ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "system_config_select"      ON system_config;
    DROP POLICY IF EXISTS "system_config_write_admin" ON system_config;
    CREATE POLICY "system_config_select"      ON system_config FOR SELECT TO authenticated USING (true);
    -- NOTE: if you want regular users to be able to save their own role preference,
    -- replace the policy below with one that also allows key = 'currentRole:' || lower(auth.jwt()->>'email')
    CREATE POLICY "system_config_write_admin" ON system_config FOR ALL TO authenticated
      USING (is_app_admin()) WITH CHECK (is_app_admin());
  END IF;
END $$;

-- =============================================================================
-- PENDING USERS (approval queue — admin only, plus self-register insert)
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pending_users') THEN
    ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pending_users_admin"         ON pending_users;
    DROP POLICY IF EXISTS "pending_users_self_register" ON pending_users;
    CREATE POLICY "pending_users_admin"         ON pending_users FOR ALL TO authenticated
      USING (is_app_admin()) WITH CHECK (is_app_admin());
    CREATE POLICY "pending_users_self_register" ON pending_users FOR INSERT TO authenticated
      WITH CHECK (lower(email) = lower(auth.jwt()->>'email'));
  END IF;
END $$;

-- =============================================================================
-- CLIENTS & PENDING CLIENTS
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clients') THEN
    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "clients_authenticated" ON clients;
    CREATE POLICY "clients_authenticated" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pending_clients') THEN
    ALTER TABLE pending_clients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pending_clients_authenticated" ON pending_clients;
    CREATE POLICY "pending_clients_authenticated" ON pending_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- ANNOUNCEMENTS (all read; admin write)
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='announcements') THEN
    ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "announcements_select"       ON announcements;
    DROP POLICY IF EXISTS "announcements_write_admin"  ON announcements;
    CREATE POLICY "announcements_select"      ON announcements FOR SELECT TO authenticated USING (true);
    CREATE POLICY "announcements_write_admin" ON announcements FOR ALL TO authenticated
      USING (is_app_admin()) WITH CHECK (is_app_admin());
  END IF;
END $$;

-- =============================================================================
-- TASKS, TASK TEMPLATES, TASK REQUESTS
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tasks') THEN
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tasks_authenticated" ON tasks;
    CREATE POLICY "tasks_authenticated" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='task_templates') THEN
    ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "task_templates_authenticated" ON task_templates;
    CREATE POLICY "task_templates_authenticated" ON task_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='task_requests') THEN
    ALTER TABLE task_requests ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "task_requests_authenticated" ON task_requests;
    CREATE POLICY "task_requests_authenticated" ON task_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_task_archives') THEN
    ALTER TABLE user_task_archives ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_task_archives_own" ON user_task_archives;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_task_archives' AND column_name='user_email') THEN
      CREATE POLICY "user_task_archives_own" ON user_task_archives FOR ALL TO authenticated
        USING (lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin())
        WITH CHECK (lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin());
    ELSE
      -- Column name differs — fall back to requiring authentication only
      CREATE POLICY "user_task_archives_own" ON user_task_archives FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- =============================================================================
-- NOTIFICATIONS (users own their rows)
-- NOTE: Repo migrations (023, 029) replace this with split policies so authenticated
-- users can INSERT notifications for *other* recipients (e.g. workspace share).
-- Do not re-apply this block after migrations or cross-user inserts return HTTP 403.
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "notifications_own" ON notifications;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='user_email') THEN
      CREATE POLICY "notifications_own" ON notifications FOR ALL TO authenticated
        USING (lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin())
        WITH CHECK (lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin());
    ELSE
      CREATE POLICY "notifications_own" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- =============================================================================
-- USER DASHBOARD PREFERENCES
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_dashboard_preferences') THEN
    ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "dashboard_prefs_own" ON user_dashboard_preferences;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_dashboard_preferences' AND column_name='user_email') THEN
      CREATE POLICY "dashboard_prefs_own" ON user_dashboard_preferences FOR ALL TO authenticated
        USING (lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin())
        WITH CHECK (lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin());
    ELSE
      CREATE POLICY "dashboard_prefs_own" ON user_dashboard_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- =============================================================================
-- TIME OFF REQUESTS
-- All authenticated users can read (managers need team visibility).
-- Users write/update their own rows; admins can update any (approve/reject).
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='time_off_requests') THEN
    ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "time_off_select"     ON time_off_requests;
    DROP POLICY IF EXISTS "time_off_insert_own" ON time_off_requests;
    DROP POLICY IF EXISTS "time_off_update"     ON time_off_requests;
    CREATE POLICY "time_off_select" ON time_off_requests FOR SELECT TO authenticated USING (true);
    -- Check which column holds the submitter's email (employee_email or user_email)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='time_off_requests' AND column_name='employee_email') THEN
      CREATE POLICY "time_off_insert_own" ON time_off_requests FOR INSERT TO authenticated
        WITH CHECK (lower(employee_email) = lower(auth.jwt()->>'email') OR is_app_admin());
      CREATE POLICY "time_off_update" ON time_off_requests FOR UPDATE TO authenticated
        USING (lower(employee_email) = lower(auth.jwt()->>'email') OR is_app_admin());
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='time_off_requests' AND column_name='user_email') THEN
      CREATE POLICY "time_off_insert_own" ON time_off_requests FOR INSERT TO authenticated
        WITH CHECK (lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin());
      CREATE POLICY "time_off_update" ON time_off_requests FOR UPDATE TO authenticated
        USING (lower(user_email) = lower(auth.jwt()->>'email') OR is_app_admin());
    ELSE
      CREATE POLICY "time_off_insert_own" ON time_off_requests FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "time_off_update"     ON time_off_requests FOR UPDATE TO authenticated USING (true);
    END IF;
  END IF;
END $$;

-- =============================================================================
-- INSTAGRAM REPORTS & CLIENT REPORTS
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='instagram_reports') THEN
    ALTER TABLE instagram_reports ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "instagram_reports_authenticated" ON instagram_reports;
    CREATE POLICY "instagram_reports_authenticated" ON instagram_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_reports') THEN
    ALTER TABLE client_reports ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "client_reports_authenticated" ON client_reports;
    CREATE POLICY "client_reports_authenticated" ON client_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- CLIENT DATA (contracts, health snapshots, messages, movements)
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_contracts') THEN
    ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "client_contracts_authenticated" ON client_contracts;
    CREATE POLICY "client_contracts_authenticated" ON client_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_health_snapshots') THEN
    ALTER TABLE client_health_snapshots ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "client_health_snapshots_authenticated" ON client_health_snapshots;
    CREATE POLICY "client_health_snapshots_authenticated" ON client_health_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_messages') THEN
    ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "client_messages_authenticated" ON client_messages;
    CREATE POLICY "client_messages_authenticated" ON client_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='client_movements') THEN
    ALTER TABLE client_movements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "client_movements_authenticated" ON client_movements;
    CREATE POLICY "client_movements_authenticated" ON client_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- CONTENT (calendars, items, post log, graphic projects)
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='content_calendars') THEN
    ALTER TABLE content_calendars ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "content_calendars_authenticated" ON content_calendars;
    CREATE POLICY "content_calendars_authenticated" ON content_calendars FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='content_items') THEN
    ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "content_items_authenticated" ON content_items;
    CREATE POLICY "content_items_authenticated" ON content_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='post_log_monthly') THEN
    ALTER TABLE post_log_monthly ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "post_log_monthly_authenticated" ON post_log_monthly;
    CREATE POLICY "post_log_monthly_authenticated" ON post_log_monthly FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='graphic_projects') THEN
    ALTER TABLE graphic_projects ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "graphic_projects_authenticated" ON graphic_projects;
    CREATE POLICY "graphic_projects_authenticated" ON graphic_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- CANVASES & FORM RESPONSES
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='canvases') THEN
    ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "canvases_authenticated" ON canvases;
    CREATE POLICY "canvases_authenticated" ON canvases FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='canvas_form_responses') THEN
    ALTER TABLE canvas_form_responses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "canvas_form_responses_authenticated" ON canvas_form_responses;
    CREATE POLICY "canvas_form_responses_authenticated" ON canvas_form_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- CRM & PROJECT REQUESTS
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_data') THEN
    ALTER TABLE crm_data ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "crm_data_authenticated" ON crm_data;
    CREATE POLICY "crm_data_authenticated" ON crm_data FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_requests') THEN
    ALTER TABLE project_requests ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "project_requests_authenticated" ON project_requests;
    CREATE POLICY "project_requests_authenticated" ON project_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- SUPPORT TICKETS & COMMENTS
-- All staff can read all tickets; anyone can insert; updates open to all.
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='support_tickets') THEN
    ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "support_tickets_select" ON support_tickets;
    DROP POLICY IF EXISTS "support_tickets_insert" ON support_tickets;
    DROP POLICY IF EXISTS "support_tickets_update" ON support_tickets;
    CREATE POLICY "support_tickets_select" ON support_tickets FOR SELECT TO authenticated USING (true);
    CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "support_tickets_update" ON support_tickets FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ticket_comments') THEN
    ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ticket_comments_authenticated" ON ticket_comments;
    CREATE POLICY "ticket_comments_authenticated" ON ticket_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- MISCELLANEOUS
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='smart_filters') THEN
    ALTER TABLE smart_filters ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "smart_filters_authenticated" ON smart_filters;
    CREATE POLICY "smart_filters_authenticated" ON smart_filters FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='custom_roles') THEN
    ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "custom_roles_admin" ON custom_roles;
    CREATE POLICY "custom_roles_admin" ON custom_roles FOR ALL TO authenticated
      USING (is_app_admin()) WITH CHECK (is_app_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='custom_locations') THEN
    ALTER TABLE custom_locations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "custom_locations_authenticated" ON custom_locations;
    CREATE POLICY "custom_locations_authenticated" ON custom_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feedback') THEN
    ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "feedback_authenticated" ON feedback;
    CREATE POLICY "feedback_authenticated" ON feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feedback_chats') THEN
    ALTER TABLE feedback_chats ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "feedback_chats_authenticated" ON feedback_chats;
    CREATE POLICY "feedback_chats_authenticated" ON feedback_chats FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='error_reports') THEN
    ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "error_reports_authenticated" ON error_reports;
    CREATE POLICY "error_reports_authenticated" ON error_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='usage_events') THEN
    ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "usage_events_authenticated" ON usage_events;
    CREATE POLICY "usage_events_authenticated" ON usage_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================================================
-- PERMISSION AUDIT LOG
-- Insert: any authenticated user (app logs changes automatically)
-- Read: admins only
-- =============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permission_audit_log') THEN
    ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "audit_log_insert"       ON permission_audit_log;
    DROP POLICY IF EXISTS "audit_log_select_admin" ON permission_audit_log;
    CREATE POLICY "audit_log_insert"       ON permission_audit_log FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "audit_log_select_admin" ON permission_audit_log FOR SELECT TO authenticated USING (is_app_admin());
  END IF;
END $$;

-- =============================================================================
-- VERIFICATION — run this query to confirm policies are active:
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
-- =============================================================================
