-- Display name on leave rows (Firebase / app parity); backfill optional in app or fix_leave_requests.sql
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS employee_name TEXT;
