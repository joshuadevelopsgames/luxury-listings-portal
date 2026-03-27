-- ============================================================
-- MIGRATION 016: Fix mutable search_path on security functions
-- ============================================================

DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'set_updated_at_posting_packages',
        'is_app_admin',
        'increment_permissions_version',
        'set_updated_at',
        'update_updated_at_column',
        'authorize'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, pg_temp',
      fn.oid::regprocedure
    );
  END LOOP;
END $$;
