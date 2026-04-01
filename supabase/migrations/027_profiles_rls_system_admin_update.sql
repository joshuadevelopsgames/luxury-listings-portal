-- Permissions Management updates other users' page_permissions via the client.
-- profiles_update_staff_admin (018) only allows role IN ('admin','director','hr_manager').
-- App "system admins" (system_config admins + bootstrap) may have other roles — same
-- cohort as canvases (022). Allow them to UPDATE any profile row.

DROP POLICY IF EXISTS "profiles_update_system_admin" ON profiles;

CREATE POLICY "profiles_update_system_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (public.auth_email_is_system_admin())
  WITH CHECK (public.auth_email_is_system_admin());
