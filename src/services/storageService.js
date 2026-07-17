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

/**
 * Upload a file for one-shot AI Vision extraction and return a URL the model can
 * fetch. Prefers a short-lived SIGNED URL (private even if the bucket is public,
 * and works for private buckets too); falls back to the public URL if signing
 * isn't permitted. Callers should delete the file with removeFiles() afterwards.
 *
 * @param {string} path — storage path, e.g. "report-extractions/<id>/0.jpg"
 * @param {File|Blob} file
 * @param {number} expiresIn — signed-URL lifetime in seconds (default 10 min)
 * @returns {Promise<string>} a fetchable URL
 */
export async function uploadFileForVision(path, file, expiresIn = 600) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (error) throw error;

  try {
    const { data, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);
    if (!signErr && data?.signedUrl) return data.signedUrl;
  } catch {
    /* fall back to the public URL below */
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort deletion of temp files. Never throws. */
export async function removeFiles(paths) {
  if (!paths || !paths.length) return;
  try {
    await supabase.storage.from(BUCKET).remove(paths);
  } catch (e) {
    console.warn('Storage cleanup failed (non-fatal):', e?.message || e);
  }
}
