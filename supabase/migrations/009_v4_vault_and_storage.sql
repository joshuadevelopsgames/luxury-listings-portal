-- ============================================================
-- 009_v4_vault_and_storage.sql
-- Supabase Vault for secrets + Storage bucket for media
-- ============================================================

-- Enable Vault (already available in all Supabase projects)
-- vault.create_secret(secret, name, description)
-- We store the DB password so it's retrievable by service-role queries only.

SELECT vault.create_secret(
  'p1NLpqeePP15kz207Emb7M9S',       -- secret value
  'db_password',                      -- name (used to look up later)
  'Supabase DB password for luxury-listings-v4'
)
WHERE NOT EXISTS (
  SELECT 1 FROM vault.decrypted_secrets WHERE name = 'db_password'
);

-- ── Storage bucket for content media ─────────────────────────────────────────
-- Creates the 'media' bucket used by contentService.uploadMedia()
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,                                      -- public so media_urls render without auth
  52428800,                                  -- 50 MB per file
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the media bucket
-- Authenticated users can upload/update/delete their own files
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

CREATE POLICY "Authenticated users can update their media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media' AND auth.uid() = owner);

CREATE POLICY "Authenticated users can delete their media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media' AND auth.uid() = owner);

-- Public read (since bucket is public, objects are accessible via public URL)
CREATE POLICY "Public read for media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'media');
