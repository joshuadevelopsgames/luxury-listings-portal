-- The deployed feedback table was created by 012's slim `CREATE TABLE IF NOT
-- EXISTS feedback` shape plus 012's ADD COLUMNs (user_email, message,
-- admin_notes, archived). Migration 010's fuller definition — which included
-- `description` and `priority` — never applied to the remote DB (010 isn't in
-- the remote migration history), so those two columns are missing.
--
-- createFeedback (see supabaseFirestoreService.js) inserts both `description`
-- and `priority`, so every bug/feature submission 400s with a PostgREST
-- "column not found" error. Add the columns to match the intended schema.

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
