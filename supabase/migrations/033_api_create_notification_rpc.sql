-- Client INSERT still hit 42501: PostgREST evaluates RLS WITH CHECK in a context where
-- helper functions / OWNER TO postgres did not reliably pass. Inserts from a
-- SECURITY DEFINER function run as superuser bypass RLS on notifications.
--
-- No Supabase dashboard setting required — apply migration and deploy app using .rpc().

CREATE OR REPLACE FUNCTION public.api_create_notification(
  p_user_id uuid,
  p_user_email text,
  p_type text,
  p_title text,
  p_body text,
  p_message text,
  p_link text,
  p_task_request_id text
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id) THEN
    RAISE EXCEPTION 'invalid notification recipient';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    user_email,
    type,
    title,
    body,
    message,
    link,
    read,
    count,
    task_request_id,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    lower(trim(coalesce(p_user_email, ''))),
    coalesce(nullif(trim(p_type), ''), 'info'),
    coalesce(nullif(trim(p_title), ''), 'Notification'),
    p_body,
    p_message,
    p_link,
    false,
    1,
    p_task_request_id,
    now(),
    now()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

ALTER FUNCTION public.api_create_notification(
  uuid, text, text, text, text, text, text, text
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.api_create_notification(
  uuid, text, text, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.api_create_notification(
  uuid, text, text, text, text, text, text, text
) TO authenticated;
