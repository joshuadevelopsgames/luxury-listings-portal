-- Fixes 030: STABLE + SET LOCAL caused 0A000 "SET is not allowed in a non-volatile function".
-- Replaces function with VOLATILE so SET LOCAL row_security is valid.

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
  SET LOCAL row_security = off;
  RETURN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = target_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.notification_recipient_exists(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notification_recipient_exists(uuid) TO authenticated;
