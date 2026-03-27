-- ============================================================
-- MIGRATION 017: Harden calendars/content_items RLS policies
-- ============================================================

-- calendars: replace permissive policies with owner checks
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Users can insert their own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Users can update their own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Users can delete their own calendars" ON public.calendars;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendars'
      AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE POLICY "calendars_select_own" ON public.calendars FOR SELECT TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "calendars_insert_own" ON public.calendars FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "calendars_update_own" ON public.calendars FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "calendars_delete_own" ON public.calendars FOR DELETE TO authenticated USING (user_id = auth.uid())';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendars'
      AND column_name = 'user_email'
  ) THEN
    EXECUTE 'CREATE POLICY "calendars_select_own" ON public.calendars FOR SELECT TO authenticated USING (lower(user_email) = lower(auth.jwt() ->> ''email''))';
    EXECUTE 'CREATE POLICY "calendars_insert_own" ON public.calendars FOR INSERT TO authenticated WITH CHECK (lower(user_email) = lower(auth.jwt() ->> ''email''))';
    EXECUTE 'CREATE POLICY "calendars_update_own" ON public.calendars FOR UPDATE TO authenticated USING (lower(user_email) = lower(auth.jwt() ->> ''email'')) WITH CHECK (lower(user_email) = lower(auth.jwt() ->> ''email''))';
    EXECUTE 'CREATE POLICY "calendars_delete_own" ON public.calendars FOR DELETE TO authenticated USING (lower(user_email) = lower(auth.jwt() ->> ''email''))';
  END IF;
END $$;

-- content_items: replace permissive policies with owner checks
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own content items" ON public.content_items;
DROP POLICY IF EXISTS "Users can insert their own content items" ON public.content_items;
DROP POLICY IF EXISTS "Users can update their own content items" ON public.content_items;
DROP POLICY IF EXISTS "Users can delete their own content items" ON public.content_items;
DROP POLICY IF EXISTS "content_items_own" ON public.content_items;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_items'
      AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE POLICY "content_items_select_own" ON public.content_items FOR SELECT TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "content_items_insert_own" ON public.content_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "content_items_update_own" ON public.content_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "content_items_delete_own" ON public.content_items FOR DELETE TO authenticated USING (user_id = auth.uid())';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_items'
      AND column_name = 'user_email'
  ) THEN
    EXECUTE 'CREATE POLICY "content_items_select_own" ON public.content_items FOR SELECT TO authenticated USING (lower(user_email) = lower(auth.jwt() ->> ''email''))';
    EXECUTE 'CREATE POLICY "content_items_insert_own" ON public.content_items FOR INSERT TO authenticated WITH CHECK (lower(user_email) = lower(auth.jwt() ->> ''email''))';
    EXECUTE 'CREATE POLICY "content_items_update_own" ON public.content_items FOR UPDATE TO authenticated USING (lower(user_email) = lower(auth.jwt() ->> ''email'')) WITH CHECK (lower(user_email) = lower(auth.jwt() ->> ''email''))';
    EXECUTE 'CREATE POLICY "content_items_delete_own" ON public.content_items FOR DELETE TO authenticated USING (lower(user_email) = lower(auth.jwt() ->> ''email''))';
  END IF;
END $$;
