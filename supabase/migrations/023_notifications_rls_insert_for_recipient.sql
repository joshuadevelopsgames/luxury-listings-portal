-- Allow authenticated users to create notifications for any valid profile (e.g. workspace share).
-- Previous FOR ALL policy required user_id = auth.uid() on INSERT, which blocked notifying others.
-- Idempotent: safe if partially applied or re-run in SQL editor.

DROP POLICY IF EXISTS "notifications_own" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = notifications.user_id)
  );

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
