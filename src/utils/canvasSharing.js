/**
 * Shared helpers for canvas ("shared workspace") sharing.
 *
 * Both the v3 service (`supabaseFirestoreService`) and the v4 shim
 * (`firestoreServiceShim`) import these so the read/write contract for sharing
 * can't drift between code paths. Historically the two services maintained
 * `shared_with` and the denormalized `shared_with_emails` column differently,
 * which left workspaces invisible to the people they were shared with.
 */
import { supabase } from '../lib/supabase';

/**
 * Derive the canonical, lowercased, de-duplicated email list from a
 * `shared_with` array. Entries may be objects (`{ email, role }`) or bare
 * email strings. This MUST match the DB trigger in migration 036 so the
 * client and database always compute `shared_with_emails` identically.
 */
export function sharedWithToEmails(sharedWith) {
  return [
    ...new Set(
      (sharedWith || [])
        .map((s) => String((s && s.email) || s || '').toLowerCase().trim())
        .filter(Boolean)
    ),
  ];
}

/**
 * Best-effort write to `permission_audit_log` for a canvas share/unshare.
 * Never throws — auditing must never break the sharing action itself.
 */
export async function logCanvasShareAudit({
  changeType,
  targetEmail,
  changedBy,
  added = null,
  removed = null,
}) {
  try {
    await supabase.from('permission_audit_log').insert([
      {
        change_type: changeType,
        target_email: targetEmail ? String(targetEmail).toLowerCase().trim() : null,
        changed_by: changedBy != null ? String(changedBy) : null,
        added,
        removed,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (e) {
    // Non-fatal: surface for debugging but don't fail the share.
    console.warn('[canvasSharing] audit log write failed:', e?.message || e);
  }
}
