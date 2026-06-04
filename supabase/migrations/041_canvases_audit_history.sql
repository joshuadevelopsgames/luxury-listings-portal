-- 041_canvases_audit_history.sql
--
-- Reliable version history for "workspaces" (the collaborative Canvas feature).
--
-- Background: canvas_history was supposed to keep restorable versions of each
-- workspace, but it has NEVER recorded a single row, for two reasons:
--   1. The app inserts created_by = userEmail (a string), but the column is a
--      uuid FK to profiles — so every insert fails the uuid cast and is
--      swallowed by a .catch(()=>{}). (See firestoreServiceShim.saveCanvasHistorySnapshot.)
--   2. Even if it worked, snapshots were only taken for the OWNER (`if (isOwner)`),
--      so a shared collaborator's edits overwrote content with no version saved —
--      the likely way a manager's workspace notes were lost.
--
-- Fix: move snapshotting into a database trigger so EVERY content/title change is
-- versioned — owner, shared collaborator, import, or raw SQL alike — with the
-- editor's identity, and the previous states stay restorable. Adds actor_email
-- (text) for the human identity; created_by (uuid) is still resolved from
-- profiles when possible.
--
-- Related: clients audit trail is migration 040 (public.audit_log).
-- Idempotent: safe to run multiple times. Apply in the Supabase SQL Editor.

-- 1. Human-readable actor (the existing created_by is a uuid FK to profiles).
alter table public.canvas_history
  add column if not exists actor_email text;

create index if not exists idx_canvas_history_canvas_created
  on public.canvas_history (canvas_id, created_at desc);

-- 2. Trigger function — snapshot the saved state on every content/title change.
--    SECURITY DEFINER so it can write canvas_history regardless of the caller's
--    RLS, and so it works for writes that bypass the app entirely.
create or replace function public.canvas_snapshot_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claims jsonb;
  v_email  text;
  v_role   text;
  v_uuid   uuid;
begin
  -- Only snapshot meaningful changes (ignore share/emoji-only updates).
  if tg_op = 'UPDATE'
     and new.content is not distinct from old.content
     and new.title   is not distinct from old.title then
    return new;
  end if;

  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_claims := null;
  end;
  v_email := v_claims ->> 'email';
  v_role  := v_claims ->> 'role';

  -- Resolve the profiles uuid for the existing created_by FK when we can.
  if v_email is not null then
    select id into v_uuid from public.profiles where lower(email) = lower(v_email) limit 1;
  end if;

  insert into public.canvas_history (canvas_id, blocks, title, created_by, actor_email)
  values (
    new.id,
    new.content,
    new.title,
    v_uuid,
    coalesce(v_email, v_role, current_user)
  );

  -- Keep the latest 100 versions per canvas.
  delete from public.canvas_history h
  where h.canvas_id = new.id
    and h.id not in (
      select id from public.canvas_history
      where canvas_id = new.id
      order by created_at desc
      limit 100
    );

  return new;
end;
$$;

-- 3. Fire after insert (initial baseline) and after content/title updates.
drop trigger if exists trg_canvas_snapshot_history on public.canvases;
create trigger trg_canvas_snapshot_history
  after insert or update on public.canvases
  for each row execute function public.canvas_snapshot_history();

-- 4. Verification (run after applying):
--      -- edit a workspace as a NON-owner collaborator, then:
--      select created_at, actor_email, title, jsonb_array_length(blocks) as blocks
--      from public.canvas_history
--      where canvas_id = '<canvas uuid>'
--      order by created_at desc
--      limit 20;
