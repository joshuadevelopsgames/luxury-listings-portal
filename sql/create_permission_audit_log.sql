-- Permission Audit Log table
-- Tracks all permission changes for accountability and debugging
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS permission_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_email text NOT NULL,
  changed_by text NOT NULL DEFAULT 'system',
  change_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  added jsonb DEFAULT '[]'::jsonb,
  removed jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for looking up changes by target user
CREATE INDEX IF NOT EXISTS idx_audit_target_email ON permission_audit_log (target_email, created_at DESC);

-- Index for looking up who made changes
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON permission_audit_log (changed_by, created_at DESC);

-- Allow inserts from the anon/authenticated roles (audit logging should never fail silently)
ALTER TABLE permission_audit_log DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE permission_audit_log IS 'Tracks all permission changes — who changed what, when, and what the old/new values were';
