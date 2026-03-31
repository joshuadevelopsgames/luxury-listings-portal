-- instagram_reports write RLS was limited to admin/director/manager/content_manager.
-- Most staff use profiles.role = team_member (etc.) but are allowed to manage reports
-- for clients assigned to them in the app — mirror that here.

DROP POLICY IF EXISTS "instagram_reports_write" ON instagram_reports;

-- Elevated roles: full insert/update/delete on all rows (same intent as legacy policy,
-- plus account_manager who has instagram-reports in app module map).
-- Non-elevated: insert only for assigned clients; update/delete if assigned OR they created the row.

CREATE POLICY "instagram_reports_insert" ON instagram_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN (
      'admin',
      'director',
      'manager',
      'content_manager',
      'account_manager',
      'social_media_manager'
    )
    OR (
      client_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = instagram_reports.client_id
          AND (
            lower(trim(coalesce(c.assigned_manager, ''))) = lower(trim(coalesce((SELECT email FROM profiles WHERE id = auth.uid()), '')))
            OR lower(trim(coalesce(c.assigned_manager_email, ''))) = lower(trim(coalesce((SELECT email FROM profiles WHERE id = auth.uid()), '')))
            OR lower(trim(coalesce(c.assigned_manager, ''))) = lower(trim(auth.uid()::text))
            OR lower(trim(coalesce(c.assigned_manager_email, ''))) = lower(trim(auth.uid()::text))
          )
      )
    )
  );

CREATE POLICY "instagram_reports_update" ON instagram_reports
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN (
      'admin',
      'director',
      'manager',
      'content_manager',
      'account_manager',
      'social_media_manager'
    )
    OR created_by_id = auth.uid()
    OR (
      client_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = instagram_reports.client_id
          AND (
            lower(trim(coalesce(c.assigned_manager, ''))) = lower(trim(coalesce((SELECT email FROM profiles WHERE id = auth.uid()), '')))
            OR lower(trim(coalesce(c.assigned_manager_email, ''))) = lower(trim(coalesce((SELECT email FROM profiles WHERE id = auth.uid()), '')))
            OR lower(trim(coalesce(c.assigned_manager, ''))) = lower(trim(auth.uid()::text))
            OR lower(trim(coalesce(c.assigned_manager_email, ''))) = lower(trim(auth.uid()::text))
          )
      )
    )
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN (
      'admin',
      'director',
      'manager',
      'content_manager',
      'account_manager',
      'social_media_manager'
    )
    OR created_by_id = auth.uid()
    OR (
      client_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = instagram_reports.client_id
          AND (
            lower(trim(coalesce(c.assigned_manager, ''))) = lower(trim(coalesce((SELECT email FROM profiles WHERE id = auth.uid()), '')))
            OR lower(trim(coalesce(c.assigned_manager_email, ''))) = lower(trim(coalesce((SELECT email FROM profiles WHERE id = auth.uid()), '')))
            OR lower(trim(coalesce(c.assigned_manager, ''))) = lower(trim(auth.uid()::text))
            OR lower(trim(coalesce(c.assigned_manager_email, ''))) = lower(trim(auth.uid()::text))
          )
      )
    )
  );

CREATE POLICY "instagram_reports_delete" ON instagram_reports
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN (
      'admin',
      'director',
      'manager',
      'content_manager',
      'account_manager',
      'social_media_manager'
    )
    OR created_by_id = auth.uid()
    OR (
      client_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = instagram_reports.client_id
          AND (
            lower(trim(coalesce(c.assigned_manager, ''))) = lower(trim(coalesce((SELECT email FROM profiles WHERE id = auth.uid()), '')))
            OR lower(trim(coalesce(c.assigned_manager_email, ''))) = lower(trim(coalesce((SELECT email FROM profiles WHERE id = auth.uid()), '')))
            OR lower(trim(coalesce(c.assigned_manager, ''))) = lower(trim(auth.uid()::text))
            OR lower(trim(coalesce(c.assigned_manager_email, ''))) = lower(trim(auth.uid()::text))
          )
      )
    )
  );
