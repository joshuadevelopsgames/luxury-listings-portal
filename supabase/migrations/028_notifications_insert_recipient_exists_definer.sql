-- INSERT policy used EXISTS (SELECT 1 FROM profiles WHERE id = user_id). That subquery
-- runs with the invoker's rights; if profiles RLS no longer allows reading all rows,
-- EXISTS is false and inserts fail with "new row violates row-level security policy".

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

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;

CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL
    AND public.notification_recipient_exists(user_id)
  );
