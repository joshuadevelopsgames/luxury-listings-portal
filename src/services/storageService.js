/**
 * Supabase Storage Service
 *
 * Replaces Firebase Storage for file uploads. Uses the public "media" bucket.
 * Provides a simple uploadFile(path, file) → publicURL API.
 */
import { supabase } from '../lib/supabase';

const BUCKET = 'media';

/**
 * Upload a file to Supabase Storage and return its public URL.
 *
 * @param {string} path  — storage path, e.g. "client-photos/abc123/profile_1234.jpg"
 * @param {File|Blob} file — the file to upload
 * @returns {Promise<string>} — the public URL of the uploaded file
 */
export async function uploadFile(path, file) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
