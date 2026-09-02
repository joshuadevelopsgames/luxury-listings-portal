/**
 * Vercel Cron entry point for the monthly Instagram report reminder.
 *
 * Scheduled in vercel.json to run on the 1st of each month. It recaps the month
 * that just ended: creates per-manager tasks/notifications and sends emails
 * (each manager their own outstanding list + a full summary to matthew@ /
 * michelle@) via Resend.
 *
 * SECURITY: this endpoint writes tasks and sends real email, so it must not be
 * publicly triggerable. Set CRON_SECRET in the environment — Vercel Cron
 * automatically sends it as `Authorization: Bearer <CRON_SECRET>`. Requests
 * without the matching secret are rejected.
 *
 * Required env: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
 *               (or REACT_APP_SUPABASE_URL), RESEND_API_KEY, REMINDER_EMAIL_FROM.
 * Optional env: REPORT_REMINDER_SUMMARY_RECIPIENTS (comma-separated; defaults to
 *               matthew@ + michelle@), REPORT_REMINDER_SEND_MANAGER_EMAILS ('false'
 *               to disable per-manager emails).
 */

export const config = { maxDuration: 60 };

// Imported lazily, not at module scope. A static import of lib/*.mjs from this
// .js handler takes the function down at load with an opaque
// FUNCTION_INVOCATION_FAILED — which is why this cron silently never ran. A
// dynamic import resolves fine and keeps failures catchable.
async function loadReminder() {
  const mod = await import('../../lib/reportReminder.mjs');
  return mod.runReportReminder;
}

const DEFAULT_SUMMARY_RECIPIENTS = 'matthew@luxury-listings.com,michelle@luxury-listings.com';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const summaryRecipients = (process.env.REPORT_REMINDER_SUMMARY_RECIPIENTS || DEFAULT_SUMMARY_RECIPIENTS)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const runReportReminder = await loadReminder();
    const result = await runReportReminder({
      supabaseUrl: process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
      serviceKey:
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY,
      resendApiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.REMINDER_EMAIL_FROM,
      summaryRecipients,
      sendManagerEmails: process.env.REPORT_REMINDER_SEND_MANAGER_EMAILS !== 'false',
      targetMonth: 'previous',
    });
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('monthly-report-reminder failed:', error);
    res.status(500).json({ ok: false, error: error?.message || 'reminder failed' });
  }
}
