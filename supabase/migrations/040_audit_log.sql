-- 040_audit_log.sql
--
-- Tamper-resistant, source-agnostic audit trail.
--
-- Background: a client's notes (The Stockton Group) were silently overwritten by
-- an import script and lost with no trace. The only existing change tracking
-- (client_movements) is app-level only, so direct writes from scripts / the SQL
-- editor / the service-role key bypass it entirely — which is exactly how the
-- loss went unnoticed. A database trigger fires no matter who writes, so this
-- captures EVERY insert/update/delete on the watched tables, records who (when
-- known), and keeps the full old + new row so anything overwritten can be
-- recovered.
--
-- Idempotent: safe to run multiple times. Apply in the Supabase SQL Editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Audit table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id              bigint generated always as identity primary key,
  table_name      text        not null,
  record_id       text,
  operation       text        not null check (operation in ('INSERT','UPDATE','DELETE')),
  actor_email     text,
  actor_role      text,
  changed_columns text[],
  old_data        jsonb,
  new_data        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists audit_log_record_idx
  on public.audit_log (table_name, record_id, created_at desc);
create index if not exists audit_log_created_idx
  on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (actor_email);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Generic trigger function — attach to any table whose PK column is "id".
--    SECURITY DEFINER so it can insert into audit_log even though RLS blocks
--    direct inserts from application roles. search_path pinned for safety.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claims  jsonb;
  v_email   text;
  v_role    text;
  v_old     jsonb;
  v_new     jsonb;
  v_changed text[];
  v_record  text;
begin
  -- Actor: PostgREST puts the verified JWT claims here. Absent for raw psql /
  -- SQL editor (NULL), 'service_role' for service-key / script writes.
  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_claims := null;
  end;
  v_email := v_claims ->> 'email';
  v_role  := coalesce(v_claims ->> 'role', current_user);

  if (tg_op = 'DELETE') then
    v_old := to_jsonb(old);
    v_new := null;
    v_record := v_old ->> 'id';
  elsif (tg_op = 'INSERT') then
    v_old := null;
    v_new := to_jsonb(new);
    v_record := v_new ->> 'id';
  else -- UPDATE
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_record := v_new ->> 'id';

    select coalesce(array_agg(key order by key), '{}')
      into v_changed
    from jsonb_each(v_new) n
    where n.value is distinct from (v_old -> n.key);

    -- Ignore no-op touches that only bumped bookkeeping columns.
    if v_changed <@ array['updated_at','updatedat','updated_time'] then
      return new;
    end if;
  end if;

  insert into public.audit_log (
    table_name, record_id, operation, actor_email, actor_role,
    changed_columns, old_data, new_data
  ) values (
    tg_table_name, v_record, tg_op, v_email, v_role,
    v_changed, v_old, v_new
  );

  return coalesce(new, old);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Attach to watched tables. Start with clients; add more lines as needed
--    (each is one drop+create pair — the function is fully generic).
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists trg_audit_clients on public.clients;
create trigger trg_audit_clients
  after insert or update or delete on public.clients
  for each row execute function public.audit_row_change();

-- To extend coverage later, repeat for other tables, e.g.:
--   drop trigger if exists trg_audit_client_contracts on public.client_contracts;
--   create trigger trg_audit_client_contracts
--     after insert or update or delete on public.client_contracts
--     for each row execute function public.audit_row_change();
--   (client_listings, instagram_reports, pending_clients, …)

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — readable by signed-in users (UI gates further with VIEW_AUDIT_TRAIL);
--    no insert/update/delete policies, so application roles cannot tamper with
--    the trail. The SECURITY DEFINER trigger above is the only writer.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_authenticated on public.audit_log;
create policy audit_log_select_authenticated
  on public.audit_log
  for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Verification (run after applying):
--      -- make a change, then:
--      select created_at, operation, actor_email, actor_role, changed_columns,
--             old_data->>'notes' as old_notes, new_data->>'notes' as new_notes
--      from public.audit_log
--      where table_name = 'clients'
--      order by created_at desc
--      limit 20;
-- ─────────────────────────────────────────────────────────────────────────────
