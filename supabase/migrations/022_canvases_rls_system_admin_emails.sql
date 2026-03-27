-- Allow canvases access for app "system admins" (emails in system_config + bootstrap),
-- matching src/utils/systemAdmins.js. Without this, View As uses the real JWT; only
-- profiles.role IN ('admin','director') could see all rows — system admins may have other roles.

CREATE OR REPLACE FUNCTION public.auth_email_is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    ELSE COALESCE(
      (
        SELECT
          lower(p.email) = 'jrsschroeder@gmail.com'
          OR EXISTS (
            SELECT 1
            FROM system_config sc
            WHERE sc.key = 'admins'
              AND jsonb_typeof(sc.value->'emails') = 'array'
              AND sc.value->'emails' @> jsonb_build_array(lower(p.email))
          )
        FROM profiles p
        WHERE p.id = auth.uid()
      ),
      false
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.auth_email_is_system_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_email_is_system_admin() TO authenticated;

DROP POLICY IF EXISTS "canvases_own_or_shared" ON canvases;
CREATE POLICY "canvases_own_or_shared" ON canvases FOR ALL TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_shared = true
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'director')
    OR public.auth_email_is_system_admin()
  );
