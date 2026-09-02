/**
 * Email the HR approvers that a time-off request was submitted.
 *
 * Called from the browser right after submitLeaveRequest() succeeds, with the
 * submitter's JWT. The body carries ONLY the request id — the email contents are
 * read back from the DB with the service key, so the browser cannot dictate what
 * gets sent from our domain.
 *
 * Authorization: the caller must be the subject of the request, or hold an
 * elevated role (HR files requests on behalf of staff). Sending is idempotent
 * per request id (see lib/leaveRequestNotification.mjs), so a retry or a
 * duplicate POST cannot email twice.
 *
 * Required env: SUPABASE_SERVICE_ROLE_KEY, REACT_APP_SUPABASE_URL (or
 *               SUPABASE_URL), REACT_APP_SUPABASE_ANON_KEY (or
 *               SUPABASE_ANON_KEY), RESEND_API_KEY, REMINDER_EMAIL_FROM.
 * Optional env: LEAVE_REQUEST_NOTIFY_RECIPIENTS (comma-separated; defaults to
 *               matthew@ + michelle@), PORTAL_URL (for the review deep link).
 */

import { createClient } from '@supabase/supabase-js';
import {
  notifyLeaveRequestSubmitted,
  DEFAULT_LEAVE_NOTIFY_RECIPIENTS,
} from '../lib/leaveRequestNotification.mjs';
import { parseRecipients } from '../lib/email.mjs';

export const config = { maxDuration: 30 };

const ELEVATED_ROLES = new Set(['admin', 'director', 'content_director', 'manager']);

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    json(res, 401, { error: 'Missing authorization' });
    return;
  }

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('notify-leave-request: missing Supabase env');
    json(res, 500, { error: 'Server misconfigured' });
    return;
  }

  // Vercel usually hands us a parsed object, but not on every runtime/content
  // type — the other endpoints here guard the same way.
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    json(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const requestId = body.requestId || body.id;
  if (!requestId) {
    json(res, 400, { error: 'requestId is required' });
    return;
  }

  // ── who is calling ────────────────────────────────────────────────────────
  const token = authHeader.slice('Bearer '.length);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user?.email) {
    json(res, 401, { error: 'Invalid session' });
    return;
  }
  const callerEmail = userData.user.email.toLowerCase();

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── may they trigger a notification for this request? ─────────────────────
  const { data: row, error: rowErr } = await service
    .from('time_off_requests')
    .select('id, user_email')
    .eq('id', requestId)
    .maybeSingle();
  if (rowErr) {
    console.error('notify-leave-request: lookup failed', rowErr.message);
    json(res, 500, { error: 'Lookup failed' });
    return;
  }
  if (!row) {
    json(res, 404, { error: 'Request not found' });
    return;
  }

  const isOwner = (row.user_email || '').toLowerCase() === callerEmail;
  let allowed = isOwner;
  if (!allowed) {
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .ilike('email', callerEmail)
      .maybeSingle();
    allowed = ELEVATED_ROLES.has(profile?.role);
  }
  if (!allowed) {
    json(res, 403, { error: 'Not allowed to notify for this request' });
    return;
  }

  // ── send ──────────────────────────────────────────────────────────────────
  try {
    const result = await notifyLeaveRequestSubmitted({
      requestId,
      supabaseUrl,
      serviceKey,
      resendApiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.REMINDER_EMAIL_FROM,
      recipients: parseRecipients(
        process.env.LEAVE_REQUEST_NOTIFY_RECIPIENTS,
        DEFAULT_LEAVE_NOTIFY_RECIPIENTS
      ),
      portalUrl: process.env.PORTAL_URL || `https://${req.headers.host || ''}`,
    });
    json(res, 200, { ok: true, ...result });
  } catch (error) {
    // The request itself is already saved; a failed email must not read as a
    // failed submission. Report it, but as a soft failure.
    console.error('notify-leave-request failed:', error);
    json(res, 200, { ok: false, error: error?.message || 'notification failed' });
  }
}
