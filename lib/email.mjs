/**
 * Shared transactional-email helpers (Resend).
 *
 * Both the monthly report reminder cron and the leave-request alert send
 * through here, so a change to headers, error handling or the reply-to policy
 * applies to every email the portal sends instead of drifting per-feature.
 *
 * Requires RESEND_API_KEY and a `from` on a Resend-verified domain
 * (REMINDER_EMAIL_FROM).
 */

/**
 * POST one email to Resend.
 *
 * @param {object}   opts
 * @param {string}   opts.apiKey   RESEND_API_KEY
 * @param {string}   opts.from     verified sender, e.g. "Name <a@domain>"
 * @param {string|string[]} opts.to
 * @param {string}   opts.subject
 * @param {string}   [opts.html]
 * @param {string}   [opts.text]
 * @param {string}   [opts.replyTo]
 * @returns {Promise<object>} Resend's response, or {skipped} when there is
 *          nobody to send to. Throws on a non-2xx so callers can log/report.
 */
export async function sendResendEmail({ apiKey, from, to, subject, html, text, replyTo }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return { skipped: 'no recipients' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body}`);
  }
  return res.json();
}

/** Escape user-supplied text before interpolating it into an email body. */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Parse a comma-separated recipient env var, falling back to `fallback`. */
export function parseRecipients(value, fallback = '') {
  return String(value || fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
