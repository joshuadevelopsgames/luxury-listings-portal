-- 036_canvases_shared_with_emails_sync.sql
--
-- Keep canvases.shared_with_emails (the denormalized text[] used by the
-- `contains(shared_with_emails, …)` read path that powers "shared workspaces")
-- in lockstep with canvases.shared_with.
--
-- Background: the v3 service wrote only `shared_with`, while the v4 read path
-- filters on `shared_with_emails`. The two drifted, leaving at least one
-- workspace ("Untitled Workspace" shared with michelle@…) invisible to the
-- person it was shared with. Application code now maintains both columns, and
-- this trigger guarantees they can never diverge again — regardless of which
-- code path (or manual SQL) performs the write.
--
-- Idempotent: safe to run multiple times. Apply in the Supabase SQL Editor.

-- 1. Pure function: derive the canonical lowercased email list from shared_with.
--    Mirrors sharedWithToEmails() in src/utils/canvasSharing.js. Entries may be
--    JSON objects ({ "email": "...", "role": "..." }) or bare email strings.
create or replace function public.canvas_shared_with_emails(sw jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array(
      select distinct lower(trim(email))
      from (
        select case
                 when jsonb_typeof(elem) = 'object' then elem ->> 'email'
                 when jsonb_typeof(elem) = 'string' then elem #>> '{}'
                 else null
               end as email
        from jsonb_array_elements(coalesce(sw, '[]'::jsonb)) as elem
      ) e
      where email is not null and trim(email) <> ''
      order by 1
    ),
    '{}'::text[]
  );
$$;

-- 2. Trigger function: recompute shared_with_emails from shared_with on write.
create or replace function public.canvases_sync_shared_with_emails()
returns trigger
language plpgsql
as $$
begin
  new.shared_with_emails := public.canvas_shared_with_emails(new.shared_with);
  return new;
end;
$$;

-- 3. Fire before every insert, and before any update that touches shared_with.
drop trigger if exists trg_canvases_sync_shared_with_emails on public.canvases;
create trigger trg_canvases_sync_shared_with_emails
  before insert or update of shared_with on public.canvases
  for each row execute function public.canvases_sync_shared_with_emails();

-- 4. Backfill existing drift (one known row at time of writing).
update public.canvases
set shared_with_emails = public.canvas_shared_with_emails(shared_with)
where shared_with_emails is distinct from public.canvas_shared_with_emails(shared_with);
