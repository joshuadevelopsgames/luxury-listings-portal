-- Notifications INSERT still failing (42501): RLS applies to queries inside SECURITY DEFINER
-- unless the function runs as a role that bypasses RLS (superuser). Migration-role-owned
-- functions are often not superuser — EXISTS(profiles) returns false under invoker RLS.
-- SET LOCAL row_security inside STABLE/VOLATILE helpers is brittle in policy evaluation.
--
-- Fix: (1) Drop ALL policies on public.notifications (including dashboard / schema.sql names
--     like "Notifications: own only" that FOR ALL still blocks cross-user INSERT).
--     (2) notification_recipient_exists: LANGUAGE sql STABLE SECURITY DEFINER, simple EXISTS.
--     (3) OWNER TO postgres — superuser bypasses RLS on profiles for the existence check.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT pol.polname AS policyname
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'notifications'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', r.policyname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.notification_recipient_exists(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = target_user_id);
$$;

ALTER FUNCTION public.notification_recipient_exists(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.notification_recipient_exists(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notification_recipient_exists(uuid) TO authenticated;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL
    AND public.notification_recipient_exists(user_id)
  );

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
