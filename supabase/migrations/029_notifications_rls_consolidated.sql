-- Notifications: cross-user INSERT (e.g. workspace share) fails with HTTP 403 if a legacy
-- FOR ALL policy still requires user_id = auth.uid() or user_email = jwt() on INSERT.
-- This migration drops all known policy names and reapplies the split policies from 023 + 028.

DROP POLICY IF EXISTS "notifications_own" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

CREATE OR REPLACE FUNCTION public.notification_recipient_exists(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = target_user_id);
$$;

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
