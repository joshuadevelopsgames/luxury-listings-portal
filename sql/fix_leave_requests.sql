-- =============================================================================
-- FIX: Add employee_name column to time_off_requests and backfill from profiles
-- Also fix days_requested for existing rows where it was stored as NULL or 1
-- Run in Supabase SQL Editor.
-- =============================================================================

-- Step 1: Add employee_name column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='time_off_requests' AND column_name='employee_name'
  ) THEN
    ALTER TABLE time_off_requests ADD COLUMN employee_name text;
  END IF;
END $$;

-- Step 2: Backfill employee_name from profiles (display_name or first_name + last_name)
UPDATE time_off_requests tor
SET employee_name = COALESCE(
  p.full_name,
  NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
  SPLIT_PART(tor.user_email, '@', 1)
)
FROM profiles p
WHERE lower(tor.user_email) = lower(p.email)
  AND tor.employee_name IS NULL;

-- Step 3: Fix days_requested — compute from date range where missing or wrong
UPDATE time_off_requests
SET days_requested = GREATEST(1, (end_date::date - start_date::date))
WHERE (days_requested IS NULL OR days_requested <= 1)
  AND start_date IS NOT NULL
  AND end_date IS NOT NULL
  AND (end_date::date - start_date::date) > 1;

-- Verify:
-- SELECT id, user_email, employee_name, start_date, end_date, days_requested, status
-- FROM time_off_requests ORDER BY created_at DESC;
