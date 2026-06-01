-- 037: Remove the legacy foreign key on content_items.calendar_id.
--
-- The app stores a `content_calendars.id` in content_items.calendar_id, but
-- migration 001 originally created the column as
--   calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL
-- pointing at the legacy `calendars` table (migration 011 later tried to point it
-- at content_calendars, but `CREATE TABLE IF NOT EXISTS` skipped that redefinition
-- on databases where 001 already ran). The result in production: every insert with
-- a real calendar id fails the FK check against `calendars`, which PostgREST
-- surfaces as HTTP 409 (foreign_key_violation, 23503) — "nothing happens when I
-- click create content."
--
-- The calendar association is managed in application code (items are filtered by
-- calendar_id in JS, and calendar deletion is handled there), so a DB-level FK on
-- this column is not required. Drop ANY foreign key constraint bound to
-- content_items.calendar_id, regardless of its auto-generated name or target.
-- Idempotent: safe to run repeatedly; a no-op once the FK is gone.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE con.contype = 'f'
      AND ns.nspname = 'public'
      AND rel.relname = 'content_items'
      AND con.conkey = ARRAY[(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = rel.oid AND attname = 'calendar_id'
      )]
  LOOP
    EXECUTE format('ALTER TABLE public.content_items DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
