-- =============================================================================
-- FIX: Restrict profiles_update_own so regular users cannot escalate their own
-- permissions, role, or approval status.
-- Admins (is_app_admin()) can update any column on any profile.
-- Regular users can only update their own row AND must leave permission/role
-- columns unchanged.
-- Run in Supabase SQL Editor.
-- =============================================================================

-- Drop existing policy first
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Recreate with permission-column guard
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    lower(email) = lower(auth.jwt() ->> 'email')
    AND (
      -- Admins can change anything on their own row
      is_app_admin()
      OR (
        -- Non-admins: permission/role/approval columns must stay unchanged
        page_permissions IS NOT DISTINCT FROM (SELECT page_permissions FROM profiles WHERE lower(email) = lower(auth.jwt() ->> 'email'))
        AND feature_permissions IS NOT DISTINCT FROM (SELECT feature_permissions FROM profiles WHERE lower(email) = lower(auth.jwt() ->> 'email'))
        AND custom_permissions IS NOT DISTINCT FROM (SELECT custom_permissions FROM profiles WHERE lower(email) = lower(auth.jwt() ->> 'email'))
        AND role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE lower(email) = lower(auth.jwt() ->> 'email'))
        AND is_approved IS NOT DISTINCT FROM (SELECT is_approved FROM profiles WHERE lower(email) = lower(auth.jwt() ->> 'email'))
      )
    )
  );

-- Also ensure admins can update ANY profile (for user management)
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (is_app_admin())
  WITH CHECK (is_app_admin());
