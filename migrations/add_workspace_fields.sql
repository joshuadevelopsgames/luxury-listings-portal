-- Migration: Add Client Workspace fields
-- Run this in the Supabase SQL editor

-- client_listings: add notes and status
ALTER TABLE client_listings
  ADD COLUMN IF NOT EXISTS notes        TEXT,
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'active';

-- client_asset_folders: add source type and external link
ALTER TABLE client_asset_folders
  ADD COLUMN IF NOT EXISTS folder_source  TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS external_url   TEXT;

-- client_assets: add AI ranking fields and selection state
ALTER TABLE client_assets
  ADD COLUMN IF NOT EXISTS is_top_pick    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_selected    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_rationale   TEXT;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_client_listings_status     ON client_listings (status);
CREATE INDEX IF NOT EXISTS idx_client_assets_is_top_pick  ON client_assets (is_top_pick);
CREATE INDEX IF NOT EXISTS idx_client_assets_folder_id    ON client_assets (folder_id);
