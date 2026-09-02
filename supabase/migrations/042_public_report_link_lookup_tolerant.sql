-- ============================================================
-- MIGRATION 042: Tolerant public report-link lookup
--
-- Public link ids are 12 chars from a mixed-case alphabet
-- (generatePublicLinkId), and migration 024 matched them with an exact
-- `=`. Two things silently turned a valid link into "Report Not Found"
-- for the recipient while working fine for the sender:
--   1. Case normalization by mail-security link rewriters
--      (Outlook SafeLinks, Proofpoint, et al.) — every current id
--      contains both upper and lower case, so all were vulnerable.
--   2. Trailing punctuation picked up when the URL is pasted into
--      prose ("...your report: https://…/report/abcDEF123ghi.").
--
-- This strips trailing non-alphanumerics and compares case-insensitively.
-- Verified 0 case-insensitive collisions across all 243 existing link ids,
-- so LIMIT 1 cannot surface another client's report.
--
-- NOTE: CREATE OR REPLACE preserves the anon/authenticated EXECUTE grants
-- from migration 024; they are re-stated here so a fresh DB is correct.
-- ============================================================

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
    AND length(regexp_replace(trim(p_public_link_id), '[^A-Za-z0-9]+$', '')) > 0
    AND lower(public_link_id) = lower(regexp_replace(trim(p_public_link_id), '[^A-Za-z0-9]+$', ''))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_instagram_report_by_public_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_instagram_report_by_public_link(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_instagram_report_by_public_link(text) TO authenticated;
