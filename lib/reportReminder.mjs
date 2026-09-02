/**
 * Monthly Instagram report reminder — shared core.
 *
 * Used by both the Vercel cron route (api/cron/monthly-report-reminder.js) and
 * the manual CLI (scripts/monthly_report_reminder.mjs) so there is ONE
 * implementation.
 *
 * Because the cron fires on the 1st of the month, it looks at the month that
 * JUST ENDED (targetMonth: 'previous') — a recap of which clients never got a
 * report last month, not the empty new month.
 *
 * For each social_media_manager with clients missing a report it:
 *   1. Creates a task (deduped per calendar month) + in-app notification
 *   2. Emails that manager their own outstanding list (Resend)
 * Then it emails the summary recipients (matthew@ / michelle@) the full
 * breakdown across all managers.
 *
 * Everything is guarded: missing Resend key → skip email but still write tasks;
 * dryRun → compute + log only, no writes and no email.
 */

import { createClient } from '@supabase/supabase-js';
import { sendResendEmail, escapeHtml } from './email.mjs';

const TASK_TYPE = 'instagram_report_reminder';
const SYSTEM_SENDER = 'system@luxury-listings.com';

// ── date helpers ───────────────────────────────────────────────────────────
function nowIso() {
  return new Date().toISOString();
}

/** Bounds for the target month. 'previous' = the month that just ended. */
function monthBounds(which = 'previous', ref = new Date()) {
  const offset = which === 'current' ? 0 : -1;
  const start = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function monthLabel(bounds) {
  return bounds.start.toLocaleString('en-CA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Vancouver',
  });
}

/** Current calendar month start — used for task de-duplication. */
function currentMonthStartIso(ref = new Date()) {
  return new Date(ref.getFullYear(), ref.getMonth(), 1).toISOString();
}

/** Due date a week out, so a recap still gives time to catch up. */
function dueInDays(days, ref = new Date()) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + days);
  return d.toISOString().split('T')[0];
}

function clientDisplayName(c) {
  return c.client_name || c.name || 'Unnamed Client';
}

// ── email ──────────────────────────────────────────────────────────────────
function managerEmailBody(managerName, clients, label) {
  const lines = clients.map((c) => `• ${clientDisplayName(c)}`);
  const text =
    `Hi ${managerName || 'there'},\n\n` +
    `${clients.length} of your client${clients.length === 1 ? '' : 's'} did not get an Instagram report in ${label}:\n\n` +
    `${lines.join('\n')}\n\n` +
    `Please create the missing report${clients.length === 1 ? '' : 's'} — your Tasks page has a matching reminder.\n\n` +
    `— Luxury Listings Portal`;
  const html =
    `<p>Hi ${escapeHtml(managerName || 'there')},</p>` +
    `<p><strong>${clients.length}</strong> of your client${clients.length === 1 ? '' : 's'} did not get an Instagram report in <strong>${escapeHtml(label)}</strong>:</p>` +
    `<ul>${clients.map((c) => `<li>${escapeHtml(clientDisplayName(c))}</li>`).join('')}</ul>` +
    `<p>Please create the missing report${clients.length === 1 ? '' : 's'} — your Tasks page has a matching reminder.</p>` +
    `<p>— Luxury Listings Portal</p>`;
  return { text, html };
}

function summaryEmailBody(byManager, label, totalOutstanding) {
  if (totalOutstanding === 0) {
    const text = `All Instagram reports for ${label} were completed. Nothing outstanding. 🎉\n\n— Luxury Listings Portal`;
    const html = `<p>All Instagram reports for <strong>${escapeHtml(label)}</strong> were completed. Nothing outstanding. 🎉</p><p>— Luxury Listings Portal</p>`;
    return { text, html };
  }
  const sections = byManager
    .filter((m) => m.clients.length > 0)
    .map((m) => {
      const header = `${m.managerName || m.managerEmail} — ${m.clients.length} missing`;
      const list = m.clients.map((c) => `    • ${clientDisplayName(c)}`).join('\n');
      return `${header}\n${list}`;
    });
  const text =
    `Instagram report recap for ${label}\n\n` +
    `${totalOutstanding} report${totalOutstanding === 1 ? '' : 's'} were never created:\n\n` +
    `${sections.join('\n\n')}\n\n— Luxury Listings Portal`;
  const htmlSections = byManager
    .filter((m) => m.clients.length > 0)
    .map(
      (m) =>
        `<h3 style="margin:16px 0 4px">${escapeHtml(m.managerName || m.managerEmail)} — ${m.clients.length} missing</h3>` +
        `<ul>${m.clients.map((c) => `<li>${escapeHtml(clientDisplayName(c))}</li>`).join('')}</ul>`
    )
    .join('');
  const html =
    `<p><strong>Instagram report recap for ${escapeHtml(label)}</strong></p>` +
    `<p>${totalOutstanding} report${totalOutstanding === 1 ? '' : 's'} were never created:</p>` +
    `${htmlSections}<p>— Luxury Listings Portal</p>`;
  return { text, html };
}

// ── main ─────────────────────────────────────────────────────────────────────
/**
 * @param {object} opts
 * @param {string} opts.supabaseUrl
 * @param {string} opts.serviceKey            Supabase service-role key
 * @param {string} [opts.resendApiKey]        If absent, emails are skipped (tasks still written)
 * @param {string} [opts.fromEmail]           Resend "from" (must be a verified domain)
 * @param {string[]} [opts.summaryRecipients] matthew@ / michelle@ etc.
 * @param {boolean} [opts.sendManagerEmails=true]
 * @param {'previous'|'current'} [opts.targetMonth='previous']
 * @param {boolean} [opts.dryRun=false]       Compute + log only; no writes, no email
 * @param {Console} [opts.logger=console]
 */
export async function runReportReminder(opts = {}) {
  const {
    supabaseUrl,
    serviceKey,
    resendApiKey,
    fromEmail,
    summaryRecipients = [],
    sendManagerEmails = true,
    targetMonth = 'previous',
    dryRun = false,
    logger = console,
  } = opts;

  if (!supabaseUrl) throw new Error('supabaseUrl is required');
  if (!serviceKey) throw new Error('serviceKey (SUPABASE_SERVICE_ROLE_KEY) is required');

  const emailEnabled = Boolean(resendApiKey && fromEmail) && !dryRun;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const bounds = monthBounds(targetMonth);
  const label = monthLabel(bounds);
  logger.log(`\n📅  Report reminder — target month: ${label}${dryRun ? '  [DRY RUN]' : ''}`);
  if (!emailEnabled && !dryRun) {
    logger.log('   ⚠️  Resend not configured (RESEND_API_KEY / from). Tasks + notifications only.');
  }

  // Fetch managers, clients, and this-target-month's reports in parallel.
  const [managersRes, clientsRes, reportsRes] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, role').eq('role', 'social_media_manager'),
    supabase.from('clients').select('id, client_name, name, assigned_manager, status').neq('status', 'archived'),
    supabase
      .from('instagram_reports')
      .select('id, client_id, client_id_legacy, created_at')
      .eq('archived', false)
      .gte('created_at', bounds.start.toISOString())
      .lte('created_at', bounds.end.toISOString()),
  ]);
  if (managersRes.error) throw new Error(`profiles: ${managersRes.error.message}`);
  if (clientsRes.error) throw new Error(`clients: ${clientsRes.error.message}`);
  if (reportsRes.error) throw new Error(`instagram_reports: ${reportsRes.error.message}`);

  const managers = (managersRes.data || []).filter((m) => m.email);
  const clients = clientsRes.data || [];
  const reports = reportsRes.data || [];
  const coveredIds = new Set(reports.flatMap((r) => [r.client_id, r.client_id_legacy].filter(Boolean)));

  logger.log(`   ${managers.length} manager(s), ${clients.length} client(s), ${reports.length} report(s) in ${label}.`);

  const byManager = [];
  let tasksCreated = 0;
  let managerEmailsSent = 0;

  for (const mgr of managers) {
    const email = mgr.email.trim().toLowerCase();
    const clientsNeeding = clients.filter((c) => {
      const am = (c.assigned_manager || '').trim().toLowerCase();
      return (am === email || am === mgr.id) && !coveredIds.has(c.id);
    });
    byManager.push({
      managerEmail: email,
      managerName: mgr.full_name,
      clients: clientsNeeding,
    });
    if (clientsNeeding.length === 0) continue;

    // Task + notification (skipped in dryRun).
    if (!dryRun) {
      const created = await createTaskAndNotification(supabase, {
        userEmail: email,
        clientsNeeding,
        label,
        dueDate: dueInDays(7),
        logger,
      });
      if (created) tasksCreated++;
    }

    // Manager email.
    if (emailEnabled && sendManagerEmails) {
      const { text, html } = managerEmailBody(mgr.full_name, clientsNeeding, label);
      try {
        await sendResendEmail({
          apiKey: resendApiKey,
          from: fromEmail,
          to: email,
          subject: `Instagram reports missing for ${label} (${clientsNeeding.length})`,
          html,
          text,
        });
        managerEmailsSent++;
      } catch (e) {
        logger.error(`   ✉️  manager email to ${email} failed: ${e.message}`);
      }
    }
  }

  const totalOutstanding = byManager.reduce((n, m) => n + m.clients.length, 0);

  // Summary email to matthew@ / michelle@.
  let summarySent = false;
  if (emailEnabled && summaryRecipients.length > 0) {
    const { text, html } = summaryEmailBody(byManager, label, totalOutstanding);
    try {
      await sendResendEmail({
        apiKey: resendApiKey,
        from: fromEmail,
        to: summaryRecipients,
        subject: `Instagram report recap — ${label} (${totalOutstanding} outstanding)`,
        html,
        text,
      });
      summarySent = true;
    } catch (e) {
      logger.error(`   ✉️  summary email failed: ${e.message}`);
    }
  }

  const result = {
    targetMonth: label,
    managers: managers.length,
    clients: clients.length,
    reports: reports.length,
    totalOutstanding,
    tasksCreated,
    managerEmailsSent,
    summarySent,
    summaryRecipients,
    dryRun,
    emailEnabled,
  };
  logger.log(
    `✅  ${dryRun ? '[dry] ' : ''}${totalOutstanding} outstanding · ${tasksCreated} task(s) · ` +
      `${managerEmailsSent} manager email(s) · summary ${summarySent ? 'sent' : 'not sent'}`
  );
  return result;
}

/** Returns true if a task was created, false if a duplicate already existed. */
async function createTaskAndNotification(supabase, { userEmail, clientsNeeding, label, dueDate, logger }) {
  // Dedup: one reminder task per user per calendar month.
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('assigned_to', userEmail)
    .eq('task_type', TASK_TYPE)
    .gte('created_at', currentMonthStartIso())
    .limit(1);
  if ((existingTasks || []).length > 0) {
    logger.log(`  ⏭  ${userEmail} — reminder task already exists this month`);
    return false;
  }

  const count = clientsNeeding.length;
  const clientList = clientsNeeding.map((c) => `• ${clientDisplayName(c)}`).join('\n');
  const title = `Create Missing Instagram Reports — ${label}`;
  const description =
    `${count} client${count === 1 ? '' : 's'} did not get an Instagram report in ${label}:\n\n` +
    `${clientList}\n\n` +
    `Please create ${count === 1 ? 'it' : 'them'} as soon as possible.`;

  const { error: taskError } = await supabase.from('tasks').insert([
    {
      title,
      description,
      status: 'todo',
      priority: 3,
      assigned_to: userEmail,
      assigned_by: SYSTEM_SENDER,
      task_type: TASK_TYPE,
      due_date: dueDate,
      source: 'system',
      created_at: nowIso(),
    },
  ]);
  if (taskError) throw new Error(`task insert (${userEmail}): ${taskError.message}`);

  // Upsert notification (bump count if an unread one exists).
  const { data: existingNotif } = await supabase
    .from('notifications')
    .select('id, count')
    .eq('user_email', userEmail)
    .eq('type', TASK_TYPE)
    .eq('read', false)
    .maybeSingle();

  const message = `You have ${count} client${count === 1 ? '' : 's'} still needing Instagram reports for ${label}. Check your Tasks.`;
  if (existingNotif) {
    await supabase
      .from('notifications')
      .update({
        count: (existingNotif.count || 1) + 1,
        title: `Instagram Reports Missing — ${label}`,
        message,
        body: message,
        link: '/tasks',
        updated_at: nowIso(),
      })
      .eq('id', existingNotif.id);
  } else {
    await supabase.from('notifications').insert([
      {
        user_email: userEmail,
        type: TASK_TYPE,
        title: `Instagram Reports Missing — ${label}`,
        message,
        body: message,
        link: '/tasks',
        read: false,
        count: 1,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ]);
  }
  return true;
}
