-- feedback_chats has two conflicting shapes:
--   * 010_v4_missing_tables.sql created it as a MESSAGE table
--     (feedback_id, user_id, message — all NOT NULL).
--   * 012_v3_compat_tables.sql bolted on the V3 THREAD model
--     (user_email, subject, status, is_archived, messages JSONB) but left
--     the legacy NOT NULL constraints in place.
--
-- The app only uses the V3 thread model (see createFeedbackChat in
-- supabaseFirestoreService.js), so it never supplies feedback_id or message,
-- and every chat insert fails the legacy NOT NULL checks. Relax those two.
--
-- user_id is intentionally left NOT NULL: createFeedbackChat now sets it from
-- auth.uid(), and the feedback_chats_access RLS policy requires it.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feedback_chats' AND column_name = 'feedback_id'
  ) THEN
    ALTER TABLE feedback_chats ALTER COLUMN feedback_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feedback_chats' AND column_name = 'message'
  ) THEN
    ALTER TABLE feedback_chats ALTER COLUMN message DROP NOT NULL;
  END IF;
END $$;
