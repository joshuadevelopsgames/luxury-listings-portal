-- Add permissions_version column for optimistic locking
-- Prevents stale permission state from persisting after missed realtime updates
-- Run this in the Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions_version integer DEFAULT 0 NOT NULL;

-- Auto-increment permissions_version when page_permissions or feature_permissions change
CREATE OR REPLACE FUNCTION increment_permissions_version()
RETURNS trigger AS $$
BEGIN
  IF OLD.page_permissions IS DISTINCT FROM NEW.page_permissions
     OR OLD.feature_permissions IS DISTINCT FROM NEW.feature_permissions
     OR OLD.custom_permissions IS DISTINCT FROM NEW.custom_permissions
  THEN
    NEW.permissions_version := COALESCE(OLD.permissions_version, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_permissions_version ON profiles;
CREATE TRIGGER trg_permissions_version
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION increment_permissions_version();

COMMENT ON COLUMN profiles.permissions_version IS 'Auto-incremented on permission changes for optimistic locking';
