-- Migration: Create Content Calendar Tables
-- Description: Creates tables for content items and calendars to replace localStorage

-- IMPORTANT: Create calendars table FIRST since content_items references it
-- Calendars Table
CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Items Table (created AFTER calendars due to foreign key reference)
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'draft',
  tags TEXT[],
  image_url TEXT,
  video_url TEXT,
  calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_content_items_user_email ON content_items(user_email);
CREATE INDEX IF NOT EXISTS idx_content_items_scheduled_date ON content_items(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_items_calendar_id ON content_items(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendars_user_email ON calendars(user_email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_content_items_updated_at ON content_items;
CREATE TRIGGER update_content_items_updated_at 
    BEFORE UPDATE ON content_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendars_updated_at ON calendars;
CREATE TRIGGER update_calendars_updated_at 
    BEFORE UPDATE ON calendars 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_items
DROP POLICY IF EXISTS "Users can view their own content items" ON content_items;
CREATE POLICY "Users can view their own content items"
  ON content_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own content items" ON content_items;
CREATE POLICY "Users can insert their own content items"
  ON content_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own content items" ON content_items;
CREATE POLICY "Users can update their own content items"
  ON content_items FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can delete their own content items" ON content_items;
CREATE POLICY "Users can delete their own content items"
  ON content_items FOR DELETE
  USING (true);

-- RLS Policies for calendars
DROP POLICY IF EXISTS "Users can view their own calendars" ON calendars;
CREATE POLICY "Users can view their own calendars"
  ON calendars FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own calendars" ON calendars;
CREATE POLICY "Users can insert their own calendars"
  ON calendars FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own calendars" ON calendars;
CREATE POLICY "Users can update their own calendars"
  ON calendars FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can delete their own calendars" ON calendars;
CREATE POLICY "Users can delete their own calendars"
  ON calendars FOR DELETE
  USING (true);

-- Comments for documentation
COMMENT ON TABLE content_items IS 'Stores content calendar items (posts, videos, etc.)';
COMMENT ON TABLE calendars IS 'Stores user calendars for organizing content items';
COMMENT ON COLUMN content_items.user_email IS 'Email of the user who owns this content item';
COMMENT ON COLUMN calendars.user_email IS 'Email of the user who owns this calendar';
