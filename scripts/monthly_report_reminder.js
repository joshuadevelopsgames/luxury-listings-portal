/**
 * monthly_report_reminder.js
 *
 * Server-side companion script for the Instagram report reminder.
 * Run this via a cron job or Cowork scheduled task on the 25th of every month.
 *
 * For each social_media_manager, it:
 *   1. Finds assigned clients that still don't have a report this month
 *   2. Creates a task in the tasks table assigned to that manager
 *   3. Also creates an in-app notification
 *
 * Run manually:  node scripts/monthly_report_reminder.js
 * Requires:      @supabase/supabase-js  (already in package.json)
 */

const { createClient } = require('@supabase/supabase-js');

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
  || 'https://qbhimpuzhvgltgplpoji.supabase.co';

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY is not set. Exiting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const SYSTEM_SENDER = 'system@luxury-listings.com';

// ── Date helpers ──────────────────────────────────────────────────────────────

function nowIso() { return new Date().toISOString(); }

function currentMonthBounds() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function lastDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
}

function monthLabel() {
  return new Date().toLocaleString('en-CA', {
    month: 'long', year: 'numeric', timeZone: 'America/Vancouver'
  });
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function getManagers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('role', 'social_media_manager');
  if (error) throw new Error(`Profiles fetch failed: ${error.message}`);
  return (data || []).filter(u => u.email);
}

async function getAllClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, client_name, name, assigned_manager, status')
    .neq('status', 'archived');
  if (error) throw new Error(`Clients fetch failed: ${error.message}`);
  return data || [];
}

async function getReportsThisMonth() {
  const { start, end } = currentMonthBounds();
  const { data, error } = await supabase
    .from('instagram_reports')
    .select('id, client_id, client_id_legacy, created_at')
    .eq('archived', false)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  if (error) throw new Error(`Reports fetch failed: ${error.message}`);
  return data || [];
}

/** Check if a task of this type for this user already exists this month */
async function taskAlreadyExists(userEmail) {
  const { start } = currentMonthBounds();
  const { data } = await supabase
    .from('tasks')
    .select('id')
    .eq('assigned_to', userEmail)
    .eq('task_type', 'instagram_report_reminder')
    .gte('created_at', start.toISOString())
    .limit(1);
  return (data || []).length > 0;
}

async function createTaskAndNotification(userEmail, clientsNeeding) {
  const label       = monthLabel();
  const dueDate     = lastDayOfMonth();
  const count       = clientsNeeding.length;
  const clientList  = clientsNeeding
    .map(c => `• ${c.client_name || c.name || 'Unnamed Client'}`)
    .join('\n');

  const title       = `Create Instagram Reports — ${label}`;
  const description =
    `${count} client${count === 1 ? '' : 's'} still ${count === 1 ? 'needs' : 'need'} an Instagram report this month:\n\n` +
    `${clientList}\n\n` +
    `Please complete all reports before the end of ${label}.`;

  // Create task
  const { error: taskError } = await supabase.from('tasks').insert([{
    title,
    description,
    status:       'todo',
    priority:     3,
    assigned_to:  userEmail,
    assigned_by:  SYSTEM_SENDER,
    task_type:    'instagram_report_reminder',
    due_date:     dueDate,
    source:       'system',
    created_at:   nowIso(),
  }]);
  if (taskError) throw new Error(`Task insert failed: ${taskError.message}`);

  // Upsert notification (bump count if unread one exists)
  const { data: existing } = await supabase
    .from('notifications')
    .select('id, count')
    .eq('user_email', userEmail)
    .eq('type', 'instagram_report_reminder')
    .eq('read', false)
    .maybeSingle();

  if (existing) {
    await supabase.from('notifications').update({
      count:      (existing.count || 1) + 1,
      title:      `Monthly Instagram Reports Due — ${label}`,
      message:    `You have ${count} client${count === 1 ? '' : 's'} still needing Instagram reports. Check your Tasks.`,
      body:       `You have ${count} client${count === 1 ? '' : 's'} still needing Instagram reports. Check your Tasks.`,
      link:       '/tasks',
      updated_at: nowIso(),
    }).eq('id', existing.id);
  } else {
    await supabase.from('notifications').insert([{
      user_email:  userEmail,
      type:        'instagram_report_reminder',
      title:       `Monthly Instagram Reports Due — ${label}`,
      message:     `You have ${count} client${count === 1 ? '' : 's'} still needing Instagram reports. Check your Tasks.`,
      body:        `You have ${count} client${count === 1 ? '' : 's'} still needing Instagram reports. Check your Tasks.`,
      link:        '/tasks',
      read:        false,
      count:       1,
      created_at:  nowIso(),
      updated_at:  nowIso(),
    }]);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📅  Monthly Instagram report reminder — ${new Date().toLocaleString('en-CA', { timeZone: 'America/Vancouver' })} (Vancouver)\n`);

  const [managers, allClients, reportsThisMonth] = await Promise.all([
    getManagers(),
    getAllClients(),
    getReportsThisMonth(),
  ]);

  console.log(`   Found ${managers.length} account manager(s), ${allClients.length} client(s), ${reportsThisMonth.length} report(s) this month.\n`);

  const coveredIds = new Set(
    reportsThisMonth.flatMap(r => [r.client_id, r.client_id_legacy].filter(Boolean))
  );

  let created = 0;
  let skipped = 0;

  for (const mgr of managers) {
    const email = mgr.email.trim().toLowerCase();

    // Find clients assigned to this manager that are still missing a report
    const clientsNeeding = allClients.filter(c => {
      const am = (c.assigned_manager || '').trim().toLowerCase();
      return (am === email || am === mgr.id) && !coveredIds.has(c.id);
    });

    if (clientsNeeding.length === 0) {
      console.log(`  ✅ ${email} — all clients covered`);
      skipped++;
      continue;
    }

    // Don't create a duplicate task if one already exists this month
    const alreadyDone = await taskAlreadyExists(email);
    if (alreadyDone) {
      console.log(`  ⏭  ${email} — task already exists this month`);
      skipped++;
      continue;
    }

    await createTaskAndNotification(email, clientsNeeding);
    console.log(`  🔔 ${email} — task created for ${clientsNeeding.length} client(s): ${clientsNeeding.map(c => c.client_name || c.name).join(', ')}`);
    created++;
  }

  console.log(`\n✅  Done — ${created} task(s) created, ${skipped} manager(s) skipped.\n`);
}

main().catch(err => {
  console.error('❌  Script failed:', err);
  process.exit(1);
});
