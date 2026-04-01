-- notification_recipient_exists() must see any profile row to validate user_id on INSERT.
-- Even with SECURITY DEFINER, the inner SELECT on profiles can still be subject to RLS
-- for the function owner in some setups — causing WITH CHECK to fail (42501).
-- VOLATILE: PostgreSQL forbids SET/SET LOCAL inside STABLE functions (0A000).

CREATE OR REPLACE FUNCTION public.notification_recipient_exists(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;
  -- Session-local: restored when the function exits (PostgreSQL).
  SET LOCAL row_security = off;
  RETURN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = target_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.notification_recipient_exists(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notification_recipient_exists(uuid) TO authenticated;
