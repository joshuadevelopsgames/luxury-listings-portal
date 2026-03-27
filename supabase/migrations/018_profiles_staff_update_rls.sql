-- Allow admins, directors, and HR managers to update other users' profiles
-- (leave balances, HR fields) from Team Management. Self-update policy remains.
CREATE POLICY "profiles_update_staff_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin', 'director', 'hr_manager')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin', 'director', 'hr_manager')
  );
