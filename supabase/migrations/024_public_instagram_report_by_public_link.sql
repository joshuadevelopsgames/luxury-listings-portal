-- Public Instagram report URLs (/report/:publicLinkId) load without login.
-- Direct SELECT on instagram_reports is authenticated-only (RLS). This RPC
-- returns at most one row when the public_link_id matches — safe for anon.

CREATE OR REPLACE FUNCTION public.get_instagram_report_by_public_link(p_public_link_id text)
RETURNS SETOF instagram_reports
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT *
  FROM instagram_reports
  WHERE public_link_id IS NOT NULL
    AND length(trim(p_public_link_id)) > 0
    AND public_link_id = trim(p_public_link_id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_instagram_report_by_public_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_instagram_report_by_public_link(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_instagram_report_by_public_link(text) TO authenticated;
