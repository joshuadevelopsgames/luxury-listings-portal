/**
 * Manual runner for the monthly Instagram report reminder.
 *
 * The cron (api/cron/monthly-report-reminder.js) is the automated path; this is
 * for running it by hand. Both share lib/reportReminder.mjs so they never drift.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   RESEND_API_KEY=... REMINDER_EMAIL_FROM="Luxury Listings <reports@luxury-listings.com>" \
 *   node scripts/monthly_report_reminder.mjs [--dry-run] [--current]
 *
 *   --dry-run   Compute + log only. No tasks, notifications, or emails.
 *   --current   Target the current month instead of the previous one.
 *
 * Without RESEND_API_KEY it still writes tasks/notifications and just skips email.
 */

import { runReportReminder } from '../lib/reportReminder.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetMonth = args.includes('--current') ? 'current' : 'previous';

const summaryRecipients = (
  process.env.REPORT_REMINDER_SUMMARY_RECIPIENTS ||
  'matthew@luxury-listings.com,michelle@luxury-listings.com'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY is not set. Exiting.');
  process.exit(1);
}

runReportReminder({
  supabaseUrl:
    process.env.SUPABASE_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    'https://qbhimpuzhvgltgplpoji.supabase.co',
  serviceKey,
  resendApiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.REMINDER_EMAIL_FROM,
  summaryRecipients,
  sendManagerEmails: process.env.REPORT_REMINDER_SEND_MANAGER_EMAILS !== 'false',
  targetMonth,
  dryRun,
})
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌  Reminder failed:', err);
    process.exit(1);
  });
