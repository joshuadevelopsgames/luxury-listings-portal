#!/usr/bin/env node
/**
 * Firebase → Supabase Data Migration Script
 *
 * Exports all Firestore collections and imports them into Supabase tables.
 * Requires:
 *   - Firebase service account key at ./firebase-service-account.json
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (service role, NOT anon key)
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-firebase-to-supabase.js
 *
 * Options:
 *   --collection=clients     Migrate only a specific collection
 *   --dry-run                Print what would be migrated without writing
 *   --skip-existing          Skip rows that already exist (upsert otherwise)
 */

const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'firebase-service-account.json');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must be service role key

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_EXISTING = args.includes('--skip-existing');
const ONLY_COLLECTION = args.find(a => a.startsWith('--collection='))?.split('=')[1];

// ── Initialize Firebase Admin ───────────────────────────────────────────
let serviceAccount;
try {
  serviceAccount = require(SERVICE_ACCOUNT_PATH);
} catch {
  console.error('❌ Missing firebase-service-account.json in scripts/');
  console.error('   Download from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();
firestore.settings({ preferRest: true }); // gRPC is blocked in this env; REST works fine

// ── Initialize Supabase (service role for bypassing RLS) ────────────────
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ─────────────────────────────────────────────────────────────
function fireTimestamp(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate().toISOString();
  if (val._seconds) return new Date(val._seconds * 1000).toISOString();
  if (typeof val === 'string') return val;
  return null;
}

function sanitize(obj) {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === 'object' && obj.toDate) return fireTimestamp(obj);
  if (typeof obj === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      clean[k] = sanitize(v);
    }
    return clean;
  }
  return obj;
}

const stats = { migrated: 0, skipped: 0, errors: 0 };

async function fetchCollection(name) {
  const snapshot = await firestore.collection(name).get();
  return snapshot.docs.map(doc => ({ _firebaseId: doc.id, ...doc.data() }));
}

async function upsertBatch(table, rows, options = {}) {
  if (rows.length === 0) return;
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would insert ${rows.length} rows into ${table}`);
    stats.skipped += rows.length;
    return;
  }

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const query = supabase.from(table);

    let result;
    if (SKIP_EXISTING && options.onConflict) {
      result = await query.upsert(batch, { onConflict: options.onConflict, ignoreDuplicates: true });
    } else if (options.onConflict) {
      result = await query.upsert(batch, { onConflict: options.onConflict });
    } else {
      result = await query.insert(batch);
    }

    if (result.error) {
      console.error(`  ❌ Error inserting into ${table}:`, result.error.message);
      stats.errors += batch.length;
    } else {
      stats.migrated += batch.length;
    }
  }
}

// ── Email → Supabase user ID mapping ────────────────────────────────────
// Firebase uses email-based references; Supabase uses UUIDs.
// We build this map from existing Supabase profiles.
let emailToUserId = {};

async function buildUserMap() {
  // 1. Map from Supabase Auth users (if any)
  try {
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    for (const user of (users || [])) {
      const email = user.email?.toLowerCase();
      if (email) emailToUserId[email] = user.id;
    }
  } catch (e) {
    console.warn('  ⚠️  Could not list auth users (need service role key):', e.message);
  }

  // 2. Also map from profiles table (populated by migrateApprovedUsers)
  const { data: profiles } = await supabase.from('profiles').select('id, email');
  for (const p of (profiles || [])) {
    const email = p.email?.toLowerCase();
    if (email && !emailToUserId[email]) emailToUserId[email] = p.id;
  }

  console.log(`📋 Found ${Object.keys(emailToUserId).length} user mappings (auth + profiles)`);
}

function resolveUserId(emailOrName) {
  if (!emailOrName) return null;
  const lower = emailOrName.toLowerCase().trim();
  // Direct email match
  if (emailToUserId[lower]) return emailToUserId[lower];
  // Try matching by name in email
  for (const [email, id] of Object.entries(emailToUserId)) {
    if (email.includes(lower) || lower.includes(email.split('@')[0])) return id;
  }
  return null;
}

// ── Collection-specific migration functions ─────────────────────────────

async function migrateClients() {
  console.log('\n📦 Migrating clients...');
  const docs = await fetchCollection('clients');
  const rows = docs.map(doc => ({
    name: doc.clientName || doc.name || 'Unknown',
    status: doc.status || 'active',
    health_status: doc.healthStatus || doc.health_status || 'monitor',
    health_score: doc.healthScore || null,
    account_manager_id: resolveUserId(doc.assignedManager || doc.account_manager),
    platform: doc.platform || 'instagram',
    posts_per_month: doc.packageSize || doc.postsPerMonth || 12,
    instagram_handle: doc.instagramUsername || doc.instagram_handle || null,
    facebook_page: doc.facebookPage || null,
    notes: doc.notes || null,
    onboarded_at: fireTimestamp(doc.createdAt) ? fireTimestamp(doc.createdAt).split('T')[0] : null,
    contract_start: doc.contractStart ? fireTimestamp(doc.contractStart)?.split('T')[0] : null,
    contract_end: doc.contractEnd ? fireTimestamp(doc.contractEnd)?.split('T')[0] : null,
    monthly_value: doc.monthlyValue || null,
    created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
  }));

  console.log(`  Found ${rows.length} clients`);
  await upsertBatch('clients', rows);
}

async function migrateTasks() {
  console.log('\n📦 Migrating tasks...');
  const docs = await fetchCollection('tasks');
  const rows = docs.map(doc => ({
    title: doc.title || doc.taskTitle || 'Untitled Task',
    description: doc.description || doc.notes || null,
    status: mapTaskStatus(doc.status),
    priority: mapTaskPriority(doc.priority),
    source: doc.task_type || doc.source || 'task',
    client_id: null, // Will need post-migration linking
    assigned_to_id: resolveUserId(doc.assigned_to || doc.assignedTo),
    created_by_id: resolveUserId(doc.assigned_by || doc.assignedBy || doc.createdBy),
    due_date: doc.due_date || doc.dueDate || null,
    completed_at: doc.completed_date ? fireTimestamp(doc.completed_date) : null,
    created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
  }));

  console.log(`  Found ${rows.length} tasks`);
  await upsertBatch('tasks', rows);
}

function mapTaskStatus(status) {
  const map = {
    'pending': 'todo',
    'in-progress': 'in_progress',
    'in_progress': 'in_progress',
    'completed': 'done',
    'done': 'done',
    'cancelled': 'done',
  };
  return map[status?.toLowerCase()] || 'todo';
}

function mapTaskPriority(p) {
  if (typeof p === 'number') return Math.min(Math.max(p, 0), 4);
  const map = { 'low': 1, 'medium': 2, 'high': 3, 'urgent': 4, 'critical': 4 };
  return map[p?.toLowerCase()] || 2;
}

async function migrateInstagramReports() {
  console.log('\n📦 Migrating instagram_reports...');
  const docs = await fetchCollection('instagram_reports');

  // We need to map clientId (Firebase doc ID) → Supabase client UUID
  // First, get Supabase clients
  const { data: supaClients } = await supabase.from('clients').select('id, name, instagram_handle');
  const clientMap = {};
  for (const c of (supaClients || [])) {
    if (c.instagram_handle) clientMap[c.instagram_handle.toLowerCase()] = c.id;
    if (c.name) clientMap[c.name.toLowerCase()] = c.id;
  }

  const rows = [];
  for (const doc of docs) {
    const clientId = findClientId(doc, clientMap);
    if (!clientId) {
      console.log(`  ⚠️  Skipping report ${doc._firebaseId} — no matching client`);
      stats.skipped++;
      continue;
    }

    rows.push({
      client_id: clientId,
      created_by_id: resolveUserId(doc.createdBy),
      period_start: doc.dateRange?.start || doc.periodStart || new Date().toISOString().split('T')[0],
      period_end: doc.dateRange?.end || doc.periodEnd || new Date().toISOString().split('T')[0],
      followers_start: doc.metrics?.followersStart || doc.followersStart || null,
      followers_end: doc.metrics?.followersEnd || doc.followersEnd || null,
      total_reach: doc.metrics?.reach || doc.reach || null,
      profile_views: doc.metrics?.profileViews || doc.profileViews || null,
      impressions: doc.metrics?.impressions || doc.impressions || null,
      likes: doc.metrics?.likes || doc.likes || null,
      comments: doc.metrics?.comments || doc.comments || null,
      shares: doc.metrics?.shares || doc.shares || null,
      saves: doc.metrics?.saves || doc.saves || null,
      engagement_rate: doc.metrics?.engagementRate || null,
      posts_count: doc.metrics?.postsCount || null,
      reels_count: doc.metrics?.reelsCount || null,
      stories_count: doc.metrics?.storiesCount || null,
      screenshot_urls: doc.screenshotUrls || [],
      raw_ocr_data: sanitize(doc.metrics) || null,
      is_public: doc.isPublic || false,
      notes: doc.notes || null,
      created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
    });
  }

  console.log(`  Found ${rows.length} reports (${stats.skipped} skipped)`);
  await upsertBatch('instagram_reports', rows);
}

function findClientId(doc, clientMap) {
  // Try various fields that might reference a client
  const tryKeys = [
    doc.clientId, doc.client_id, doc.clientName,
    doc.instagramUsername, doc.instagram_handle
  ].filter(Boolean);

  for (const key of tryKeys) {
    const lower = String(key).toLowerCase();
    if (clientMap[lower]) return clientMap[lower];
  }
  return null;
}

async function migrateLeaveRequests() {
  console.log('\n📦 Migrating leave_requests → time_off_requests...');
  const docs = await fetchCollection('leave_requests');
  const rows = docs.map(doc => ({
    user_id: resolveUserId(doc.fromUserEmail || doc.userEmail),
    type: doc.leaveType || doc.type || 'vacation',
    start_date: doc.startDate || null,
    end_date: doc.endDate || null,
    status: doc.status || 'pending',
    reason: doc.reason || null,
    reviewed_by: resolveUserId(doc.reviewedBy || doc.approvedBy),
    reviewed_at: fireTimestamp(doc.reviewedAt || doc.approvedAt),
    created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
  })).filter(r => r.user_id && r.start_date && r.end_date);

  console.log(`  Found ${rows.length} time off requests`);
  await upsertBatch('time_off_requests', rows);
}

async function migrateGraphicProjects() {
  console.log('\n📦 Migrating graphic_projects...');
  const docs = await fetchCollection('graphic_projects');

  const { data: supaClients } = await supabase.from('clients').select('id, name');
  const clientMap = {};
  for (const c of (supaClients || [])) {
    if (c.name) clientMap[c.name.toLowerCase()] = c.id;
  }

  const rows = docs.map(doc => ({
    client_id: clientMap[doc.clientName?.toLowerCase()] || null,
    title: doc.title || doc.projectName || 'Untitled Project',
    description: doc.description || null,
    type: doc.type || doc.projectType || null,
    status: doc.status || 'requested',
    requested_by_id: resolveUserId(doc.requestedBy),
    assigned_to_id: resolveUserId(doc.assignedTo || doc.designer),
    due_date: doc.dueDate || null,
    delivered_at: fireTimestamp(doc.deliveredAt),
    asset_urls: doc.assetUrls || doc.deliverables || [],
    feedback: doc.feedback || null,
    created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
  }));

  console.log(`  Found ${rows.length} graphic projects`);
  await upsertBatch('graphic_projects', rows);
}

async function migrateSupportTickets() {
  console.log('\n📦 Migrating support_tickets...');
  const docs = await fetchCollection('support_tickets');
  const rows = docs.map(doc => ({
    user_id: resolveUserId(doc.userEmail),
    title: doc.title || 'Untitled Ticket',
    description: doc.description || null,
    category: doc.category || 'general',
    priority: doc.priority || 'medium',
    status: doc.status || 'open',
    assigned_to_id: resolveUserId(doc.assignedTo),
    resolved_by_id: resolveUserId(doc.resolvedBy),
    resolved_at: fireTimestamp(doc.resolvedAt),
    created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
  })).filter(r => r.user_id);

  console.log(`  Found ${rows.length} support tickets`);
  await upsertBatch('support_tickets', rows);
}

async function migrateNotifications() {
  console.log('\n📦 Migrating notifications...');
  const docs = await fetchCollection('notifications');
  const rows = docs.map(doc => ({
    user_id: resolveUserId(doc.userEmail),
    type: doc.type || 'general',
    title: doc.title || 'Notification',
    body: doc.message || doc.body || null,
    link: doc.link || null,
    read: doc.read || false,
    created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
  })).filter(r => r.user_id);

  console.log(`  Found ${rows.length} notifications`);
  await upsertBatch('notifications', rows);
}

async function migrateFeedback() {
  console.log('\n📦 Migrating feedback...');
  const docs = await fetchCollection('feedback');
  // Actual columns: id, user_id, user_email, type, title, message, status, admin_notes, archived, created_at, updated_at
  const rows = docs.map(doc => {
    const email = doc.userEmail || null;
    return {
      user_id: resolveUserId(email),
      user_email: email ? email.toLowerCase() : null,
      type: doc.type || 'feedback',
      title: doc.title || 'Untitled',
      message: doc.description || doc.message || doc.body || null,
      status: doc.status || 'open',
      created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
      updated_at: fireTimestamp(doc.updatedAt) || new Date().toISOString(),
    };
  }).filter(r => r.user_id);

  console.log(`  Found ${rows.length} feedback entries`);
  await upsertBatch('feedback', rows);
}

async function migrateContentItems() {
  console.log('\n📦 Migrating content_items → content_posts...');
  const docs = await fetchCollection('content_items');

  const { data: supaClients } = await supabase.from('clients').select('id, name');
  const clientMap = {};
  for (const c of (supaClients || [])) {
    if (c.name) clientMap[c.name.toLowerCase()] = c.id;
  }

  const rows = [];
  for (const doc of docs) {
    const clientId = clientMap[doc.clientName?.toLowerCase()] || null;
    if (!clientId) {
      stats.skipped++;
      continue;
    }
    rows.push({
      client_id: clientId,
      created_by_id: resolveUserId(doc.createdBy),
      platform: doc.platform || 'instagram',
      post_type: doc.contentType || doc.post_type || 'image',
      caption: doc.caption || null,
      hashtags: doc.hashtags ? (Array.isArray(doc.hashtags) ? doc.hashtags : doc.hashtags.split(/\s+/)) : [],
      media_urls: doc.mediaUrls || [],
      scheduled_date: doc.scheduledDate || doc.date || new Date().toISOString().split('T')[0],
      scheduled_time: doc.scheduledTime || null,
      status: doc.status || 'draft',
      approved_by_id: resolveUserId(doc.approvedBy),
      approved_at: fireTimestamp(doc.approvedAt),
      published_at: fireTimestamp(doc.publishedAt),
      ai_generated: doc.aiGenerated || false,
      notes: doc.notes || null,
      created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
    });
  }

  console.log(`  Found ${rows.length} content posts`);
  await upsertBatch('content_posts', rows);
}

async function migratePostLogMonthly() {
  console.log('\n📦 Migrating post_log_monthly → posting_packages...');
  const docs = await fetchCollection('post_log_monthly');

  const { data: supaClients } = await supabase.from('clients').select('id, name, posts_per_month');
  const clientMap = {};
  for (const c of (supaClients || [])) {
    if (c.name) clientMap[c.name.toLowerCase()] = c.id;
  }
  const clientPostsMap = {};
  for (const c of (supaClients || [])) {
    clientPostsMap[c.id] = c.posts_per_month || 12;
  }

  const rows = [];
  for (const doc of docs) {
    const clientId = clientMap[doc.clientName?.toLowerCase()] || findClientId(doc, clientMap);
    if (!clientId) {
      stats.skipped++;
      continue;
    }
    rows.push({
      client_id: clientId,
      year_month: doc.yearMonth || doc.year_month || '2026-01',
      posts_per_month: clientPostsMap[clientId] || 12,
      posts_used: doc.postsLogged || doc.posts_used || 0,
      posts_by_platform: sanitize(doc.postsByPlatform || doc.posts_by_platform) || {},
      created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
    });
  }

  console.log(`  Found ${rows.length} posting packages`);
  await upsertBatch('posting_packages', rows, { onConflict: 'client_id,year_month' });
}

async function migrateCRM() {
  console.log('\n📦 Migrating CRM data...');
  const docs = await fetchCollection('crm');

  // CRM data is stored as a single doc with leads categorized
  for (const doc of docs) {
    if (doc._firebaseId === 'CRM_DATA' || doc.leads || doc.warmLeads || doc.contactedLeads) {
      const allLeads = [
        ...(doc.warmLeads || []).map(l => ({ ...l, temperature: 'warm' })),
        ...(doc.contactedLeads || []).map(l => ({ ...l, temperature: 'warm', status: 'contacted' })),
        ...(doc.coldLeads || []).map(l => ({ ...l, temperature: 'cold' })),
        ...(doc.leads || []),
      ];

      const rows = allLeads.map(lead => ({
        name: lead.contactName || lead.name || 'Unknown',
        company: lead.company || null,
        email: lead.email || null,
        phone: lead.phone || null,
        source: lead.source || lead.leadSource || null,
        status: lead.status || 'new',
        temperature: lead.temperature || 'warm',
        score: lead.score || 50,
        owner_id: resolveUserId(lead.assignedTo || lead.owner),
        notes: lead.notes || null,
        last_contact_at: fireTimestamp(lead.lastContact),
        next_follow_up_at: lead.nextFollowUp || null,
        created_at: fireTimestamp(lead.createdAt) || new Date().toISOString(),
      }));

      console.log(`  Found ${rows.length} CRM leads`);
      await upsertBatch('leads', rows);
    }
  }
}

async function migrateCanvases() {
  console.log('\n📦 Migrating canvases...');
  const docs = await fetchCollection('canvases');
  const rows = docs.map(doc => ({
    title: doc.title || 'Untitled',
    content: sanitize(doc.blocks || doc.content || []),
    owner_id: resolveUserId(doc.ownerEmail || doc.createdBy),
    is_shared: doc.isShared || false,
    created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
  })).filter(r => r.owner_id);

  console.log(`  Found ${rows.length} canvases`);
  await upsertBatch('canvases', rows);
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROVED USERS → PROFILES  (most critical: without this, no one can log in)
// ─────────────────────────────────────────────────────────────────────────────
async function migrateApprovedUsers() {
  console.log('\n📦 Migrating approved_users → profiles...');
  const docs = await fetchCollection('approved_users');

  const usersToProcess = docs.map(doc => {
    const email = doc.email || (doc._firebaseId.includes('@') ? doc._firebaseId : null);
    if (!email) return null;
    return { email: email.toLowerCase().trim(), doc };
  }).filter(Boolean);

  console.log(`  Found ${usersToProcess.length} approved users`);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create/update ${usersToProcess.length} auth users + profiles`);
    stats.skipped += usersToProcess.length;
    return;
  }

  // profiles.id is a FK to auth.users — must create/find auth user first.
  // Use admin API to create auth users (no password; they sign in via Google OAuth).
  for (const { email, doc } of usersToProcess) {
    try {
      // Check if auth user already exists
      let userId = emailToUserId[email];

      if (!userId) {
        // Create the auth user so we get a UUID
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true, // mark email as confirmed
          user_metadata: {
            full_name: doc.displayName || [doc.firstName, doc.lastName].filter(Boolean).join(' ') || email,
            avatar_url: doc.avatar || doc.photoURL || null,
          },
        });
        if (createErr) {
          // User might already exist in auth but not in our map; try listing
          if (createErr.message?.includes('already been registered')) {
            console.warn(`  ⚠️  Auth user already exists for ${email}, skipping create`);
            // will be picked up by buildUserMap() at end
          } else {
            console.error(`  ❌ Could not create auth user for ${email}:`, createErr.message);
            stats.errors++;
            continue;
          }
        } else {
          userId = created.user.id;
          emailToUserId[email] = userId;
          console.log(`  ✅ Created auth user for ${email}`);
        }
      }

      if (!userId) { stats.skipped++; continue; }

      // Now upsert the profile row with the auth UUID
      const profileData = {
        id: userId,
        email,
        full_name: doc.displayName || [doc.firstName, doc.lastName].filter(Boolean).join(' ') || email,
        first_name: doc.firstName || null,
        last_name: doc.lastName || null,
        avatar_url: doc.avatar || doc.photoURL || null,
        role: doc.primaryRole || doc.role || 'content_director',
        roles: doc.roles || [doc.primaryRole || doc.role || 'content_director'],
        department: doc.department || null,
        position: doc.position || null,
        bio: doc.bio || null,
        phone: doc.phone || null,
        location: doc.location || null,
        start_date: doc.startDate ? (typeof doc.startDate === 'string' ? doc.startDate : fireTimestamp(doc.startDate)?.split('T')[0]) : null,
        onboarding_completed: doc.onboardingCompleted || false,
        onboarding_completed_date: fireTimestamp(doc.onboardingCompletedDate),
        custom_permissions: doc.customPermissions || [],
        page_permissions: doc.pagePermissions || [],
        feature_permissions: doc.featurePermissions || [],
        last_seen_at: fireTimestamp(doc.lastSeenAt),
        created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
        updated_at: fireTimestamp(doc.updatedAt) || new Date().toISOString(),
      };

      const { error: profileErr } = await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });
      if (profileErr) {
        console.error(`  ❌ Profile upsert failed for ${email}:`, profileErr.message);
        stats.errors++;
      } else {
        stats.migrated++;
      }
    } catch (err) {
      console.error(`  ❌ Unexpected error for ${email}:`, err.message);
      stats.errors++;
    }
  }

  // Refresh user map with newly created profile UUIDs
  await buildUserMap();
}

// ── Employees (supplement profiles with employee-specific fields) ──────────
async function migrateEmployees() {
  console.log('\n📦 Migrating employees → profiles (merge)...');
  const docs = await fetchCollection('employees');

  let updated = 0;
  for (const doc of docs) {
    const email = doc.email || (doc._firebaseId.includes('@') ? doc._firebaseId : null);
    if (!email) { stats.skipped++; continue; }

    const patch = {
      phone: doc.phone || undefined,
      department: doc.department || undefined,
      position: doc.position || undefined,
      start_date: doc.startDate ? (typeof doc.startDate === 'string' ? doc.startDate : fireTimestamp(doc.startDate)?.split('T')[0]) : undefined,
      bio: doc.bio || undefined,
    };
    // Strip undefined
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) continue;

    if (!DRY_RUN) {
      const { error } = await supabase.from('profiles').update(clean).ilike('email', email);
      if (error) {
        console.error(`  ❌ profiles update for ${email}:`, error.message);
        stats.errors++;
      } else {
        updated++;
        stats.migrated++;
      }
    }
  }
  console.log(`  Merged employee data into ${updated} profiles`);
}

// ── Task Templates ────────────────────────────────────────────────────────────
// Actual columns: id, title, user_email, is_default, shared_with, meta, created_at, updated_at
async function migrateTaskTemplates() {
  console.log('\n📦 Migrating task_templates...');
  const docs = await fetchCollection('task_templates');
  const rows = docs.map(doc => {
    const email = doc.createdByEmail || doc.userEmail || doc.createdBy || null;
    return {
      title: doc.title || 'Untitled Template',
      user_email: email && email.includes('@') ? email.toLowerCase() : null,
      is_default: doc.isDefault || false,
      shared_with: sanitize(doc.sharedWith || []),
      meta: sanitize({
        description: doc.description || null,
        priority: doc.priority || 2,
        steps: doc.steps || doc.subtasks || [],
        tags: doc.tags || [],
        source: doc.task_type || doc.source || 'task',
      }),
      created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
      updated_at: fireTimestamp(doc.updatedAt) || new Date().toISOString(),
    };
  });
  console.log(`  Found ${rows.length} task templates`);
  await upsertBatch('task_templates', rows);
}

// ── Announcements ─────────────────────────────────────────────────────────────
// Actual columns: id, title, body, type, is_active, created_by_email, link, created_at, updated_at
async function migrateAnnouncements() {
  console.log('\n📦 Migrating announcements...');
  const docs = await fetchCollection('announcements');
  const rows = docs.map(doc => {
    const createdByEmail = doc.createdByEmail || (doc.createdBy?.includes?.('@') ? doc.createdBy : null);
    return {
      title: doc.title || 'Announcement',
      body: doc.body || doc.message || doc.content || null,
      type: doc.type || 'info',
      is_active: doc.isActive !== undefined ? doc.isActive : true,
      created_by_email: createdByEmail ? createdByEmail.toLowerCase() : null,
      link: doc.link || null,
      created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
      updated_at: fireTimestamp(doc.updatedAt) || new Date().toISOString(),
    };
  }).filter(r => r.body);
  console.log(`  Found ${rows.length} announcements`);
  await upsertBatch('announcements', rows);
}

// ── System Config ─────────────────────────────────────────────────────────────
async function migrateSystemConfig() {
  console.log('\n📦 Migrating system_config...');
  const docs = await fetchCollection('system_config');
  const rows = docs.map(doc => {
    // Each Firestore doc ID is the config key; data is the value
    const key = doc._firebaseId;
    const { _firebaseId, ...rest } = doc;
    return {
      key,
      value: sanitize(rest),
      updated_at: new Date().toISOString(),
    };
  });
  console.log(`  Found ${rows.length} system config entries`);
  if (!DRY_RUN) {
    for (const row of rows) {
      const { error } = await supabase.from('system_config').upsert(row, { onConflict: 'key' });
      if (error) {
        console.error(`  ❌ system_config upsert [${row.key}]:`, error.message);
        stats.errors++;
      } else {
        stats.migrated++;
      }
    }
  } else {
    console.log(`  [DRY RUN] Would upsert ${rows.length} rows into system_config`);
    stats.skipped += rows.length;
  }
}

// ── Smart Filters ─────────────────────────────────────────────────────────────
// Actual columns: user_id (NOT NULL), user_email, name, filters, created_at, updated_at
async function migrateSmartFilters() {
  console.log('\n📦 Migrating smart_filters...');
  const docs = await fetchCollection('smart_filters');
  const rows = docs.map(doc => {
    const email = doc.userEmail || (doc.createdBy?.includes?.('@') ? doc.createdBy : null) || null;
    const userId = resolveUserId(email) || resolveUserId(doc._firebaseId);
    if (!userId) return null;
    return {
      user_id: userId,
      user_email: email ? email.toLowerCase() : null,
      name: doc.name || 'Untitled Filter',
      filters: sanitize(doc.config || doc.filters || {}),
      created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
      updated_at: fireTimestamp(doc.updatedAt) || new Date().toISOString(),
    };
  }).filter(Boolean);
  console.log(`  Found ${rows.length} smart filters`);
  await upsertBatch('smart_filters', rows);
}

// ── User Dashboard Preferences ───────────────────────────────────────────────
// Actual columns: user_id, widget_order TEXT[], hidden_widgets TEXT[], layout JSONB
async function migrateDashboardPreferences() {
  console.log('\n📦 Migrating user_dashboard_preferences...');
  const docs = await fetchCollection('user_dashboard_preferences');
  const rows = docs.map(doc => {
    const email = doc.userEmail || (doc._firebaseId?.includes?.('@') ? doc._firebaseId : null);
    const userId = resolveUserId(email) || resolveUserId(doc._firebaseId);
    if (!userId) return null;
    // Normalize widget_order: accept array of strings or array of objects with 'id'
    const rawWidgets = doc.widgetOrder || doc.widgets || doc.widget_order || [];
    const widgetOrder = Array.isArray(rawWidgets)
      ? rawWidgets.map(w => (typeof w === 'string' ? w : w?.id || w?.type || String(w))).filter(Boolean)
      : [];
    const hiddenWidgets = Array.isArray(doc.hiddenWidgets || doc.hidden_widgets)
      ? (doc.hiddenWidgets || doc.hidden_widgets).map(w => typeof w === 'string' ? w : String(w))
      : [];
    return {
      user_id: userId,
      widget_order: widgetOrder,
      hidden_widgets: hiddenWidgets,
      layout: sanitize(doc.layout || doc.customLayout || {}),
      updated_at: fireTimestamp(doc.updatedAt) || new Date().toISOString(),
    };
  }).filter(Boolean);
  console.log(`  Found ${rows.length} dashboard preference entries`);
  await upsertBatch('user_dashboard_preferences', rows, { onConflict: 'user_id' });
}

// ── Content Calendars (metadata) ──────────────────────────────────────────────
async function migrateContentCalendars() {
  console.log('\n📦 Migrating content_calendars...');
  const docs = await fetchCollection('content_calendars');

  const { data: supaClients } = await supabase.from('clients').select('id, name');
  const clientMap = {};
  for (const c of (supaClients || [])) {
    if (c.name) clientMap[c.name.toLowerCase()] = c.id;
  }

  const rows = docs.map(doc => {
    const clientId = clientMap[doc.clientName?.toLowerCase()] || null;
    if (!clientId) return null;
    return {
      client_id: clientId,
      month: doc.month || new Date().toISOString().slice(0, 7),
      status: doc.status || 'draft',
      notes: doc.notes || null,
      created_by_id: resolveUserId(doc.createdBy),
      created_at: fireTimestamp(doc.createdAt) || new Date().toISOString(),
    };
  }).filter(Boolean);

  console.log(`  Found ${rows.length} content calendars`);
  await upsertBatch('content_calendars', rows);
}

// ─────────────────────────────────────────────────────────────────────────────
// Migration collections map
// ─────────────────────────────────────────────────────────────────────────────
// !! approved_users and employees must run FIRST so buildUserMap() has UUIDs !!
const MIGRATIONS = {
  approved_users: migrateApprovedUsers, // ← runs first, critical
  employees: migrateEmployees,
  system_config: migrateSystemConfig,
  clients: migrateClients,
  tasks: migrateTasks,
  task_templates: migrateTaskTemplates,
  instagram_reports: migrateInstagramReports,
  leave_requests: migrateLeaveRequests,
  graphic_projects: migrateGraphicProjects,
  support_tickets: migrateSupportTickets,
  notifications: migrateNotifications,
  feedback: migrateFeedback,
  content_items: migrateContentItems,
  content_calendars: migrateContentCalendars,
  post_log_monthly: migratePostLogMonthly,
  crm: migrateCRM,
  canvases: migrateCanvases,
  announcements: migrateAnnouncements,
  smart_filters: migrateSmartFilters,
  user_dashboard_preferences: migrateDashboardPreferences,
};

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Firebase → Supabase Data Migration');
  console.log('═══════════════════════════════════════════════════════');
  if (DRY_RUN) console.log('  🔍 DRY RUN — no data will be written\n');

  // Build initial user map from any Supabase auth users already present
  await buildUserMap();

  const collections = ONLY_COLLECTION
    ? { [ONLY_COLLECTION]: MIGRATIONS[ONLY_COLLECTION] }
    : MIGRATIONS;

  // NOTE: If running all collections, approved_users is first in MIGRATIONS
  // and calls buildUserMap() again at the end so subsequent migrations have UUIDs.

  if (ONLY_COLLECTION && !MIGRATIONS[ONLY_COLLECTION]) {
    console.error(`❌ Unknown collection: ${ONLY_COLLECTION}`);
    console.error(`   Available: ${Object.keys(MIGRATIONS).join(', ')}`);
    process.exit(1);
  }

  for (const [name, migrateFn] of Object.entries(collections)) {
    try {
      await migrateFn();
    } catch (err) {
      console.error(`❌ Failed to migrate ${name}:`, err.message);
      stats.errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Migration Complete');
  console.log(`  ✅ Migrated: ${stats.migrated}`);
  console.log(`  ⏭️  Skipped:  ${stats.skipped}`);
  console.log(`  ❌ Errors:   ${stats.errors}`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
