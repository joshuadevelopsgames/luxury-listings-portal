/**
 * "New time-off request" alert — shared core.
 *
 * Emails the HR approvers (Michelle + Matthew by default) whenever someone
 * submits a leave request, so a pending request cannot sit unseen in the portal.
 *
 * Design notes:
 *  • The caller passes only a request id. Everything in the email is read back
 *    from the DB with the service key, so a compromised or curious browser
 *    cannot dictate the contents of an email sent from our domain.
 *  • Idempotent: the send is recorded in the request's `history` jsonb, and a
 *    request that already has a `notified` entry is skipped. That makes retries,
 *    double submits and a user re-POSTing the same id harmless.
 *  • Never throws for "email is not configured" — a missing RESEND_API_KEY
 *    returns {skipped}, because a failed notification must never make the
 *    employee think their request did not save.
 */

import { createClient } from '@supabase/supabase-js';
import { sendResendEmail, escapeHtml, parseRecipients } from './email.mjs';

export const DEFAULT_LEAVE_NOTIFY_RECIPIENTS =
  'matthew@luxury-listings.com,michelle@luxury-listings.com';

const HISTORY_ACTION = 'notified';

/** "2026-09-14" -> "Mon, Sep 14 2026" (dates are stored as plain YYYY-MM-DD). */
function formatDay(value) {
  if (!value) return '—';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(value);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatRange(start, end) {
  if (start && end && start !== end) return `${formatDay(start)} → ${formatDay(end)}`;
  return formatDay(start || end);
}

/** "vacation" / "sick_leave" -> "Vacation" / "Sick leave". */
function prettyType(value) {
  const s = String(value || '').replace(/[_-]+/g, ' ').trim();
  if (!s) return 'Time off';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function alreadyNotified(history) {
  if (!Array.isArray(history)) return false;
  return history.some((h) => h && h.action === HISTORY_ACTION);
}

function buildBody(request, portalUrl) {
  const who = request.employee_name || request.user_email || 'A team member';
  const type = prettyType(request.leave_type || request.type);
  const range = formatRange(request.start_date, request.end_date);
  const days = request.days_requested;
  const daysLine = days == null || days === '' ? null : `${days} day${Number(days) === 1 ? '' : 's'}`;
  const reason = (request.reason || request.notes || '').trim();
  const link = portalUrl ? `${String(portalUrl).replace(/\/+$/, '')}/hr-calendar` : null;

  const rows = [
    ['Employee', who],
    ['Type', type],
    ['Dates', range],
    ...(daysLine ? [['Duration', daysLine]] : []),
    ...(reason ? [['Reason', reason]] : []),
    ['Submitted by', request.user_email || '—'],
  ];

  const text =
    `${who} submitted a time-off request.\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n\nStatus: pending approval` +
    (link ? `\n\nReview it here: ${link}` : '') +
    `\n\n— Luxury Listings Portal`;

  const html =
    `<p><strong>${escapeHtml(who)}</strong> submitted a time-off request.</p>` +
    `<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">` +
    rows
      .map(
        ([k, v]) =>
          `<tr>` +
          `<td style="color:#6b7280;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td>` +
          `<td style="color:#111827"><strong>${escapeHtml(v)}</strong></td>` +
          `</tr>`
      )
      .join('') +
    `</table>` +
    `<p style="color:#6b7280;font-size:13px">Status: pending approval</p>` +
    (link
      ? `<p><a href="${escapeHtml(link)}" style="color:#c026d3">Review it in the portal →</a></p>`
      : '') +
    `<p style="color:#9ca3af;font-size:12px">— Luxury Listings Portal</p>`;

  return { subject: `Time-off request — ${who} (${range})`, html, text };
}

/**
 * Load the request, email the approvers, and record the send.
 *
 * @param {object} opts
 * @param {string} opts.requestId       time_off_requests.id
 * @param {string} opts.supabaseUrl
 * @param {string} opts.serviceKey      service role — reads the row + writes history
 * @param {string} [opts.resendApiKey]  absent → {skipped:'email not configured'}
 * @param {string} [opts.fromEmail]
 * @param {string[]} [opts.recipients]
 * @param {string} [opts.portalUrl]     used to build the "review it" deep link
 * @param {boolean} [opts.dryRun]
 */
export async function notifyLeaveRequestSubmitted(opts = {}) {
  const {
    requestId,
    supabaseUrl,
    serviceKey,
    resendApiKey,
    fromEmail,
    recipients = parseRecipients(DEFAULT_LEAVE_NOTIFY_RECIPIENTS),
    portalUrl,
    dryRun = false,
  } = opts;

  if (!requestId) throw new Error('requestId is required');
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase service credentials are required');

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: request, error } = await db
    .from('time_off_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw error;
  if (!request) return { skipped: 'request not found' };

  if (alreadyNotified(request.history)) {
    return { skipped: 'already notified', requestId };
  }

  if (!resendApiKey || !fromEmail) {
    return { skipped: 'email not configured', requestId };
  }
  if (recipients.length === 0) {
    return { skipped: 'no recipients', requestId };
  }

  const { subject, html, text } = buildBody(request, portalUrl);
  if (dryRun) return { dryRun: true, requestId, subject, recipients, text };

  const sent = await sendResendEmail({
    apiKey: resendApiKey,
    from: fromEmail,
    to: recipients,
    subject,
    html,
    text,
    // Approvers can reply straight to the employee.
    replyTo: request.user_email || undefined,
  });

  // Record the send so a retry or a duplicate POST cannot email twice. Best
  // effort: the email is already out, so a history write failure must not throw.
  const history = Array.isArray(request.history) ? request.history : [];
  const { error: historyErr } = await db
    .from('time_off_requests')
    .update({
      history: [...history, { action: HISTORY_ACTION, at: new Date().toISOString(), to: recipients }],
    })
    .eq('id', requestId);
  if (historyErr) {
    console.warn('[leave-notify] sent but could not record history:', historyErr.message);
  }

  return { sent: true, requestId, recipients, id: sent?.id };
}
