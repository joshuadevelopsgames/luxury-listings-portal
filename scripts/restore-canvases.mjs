#!/usr/bin/env node
/**
 * Restore canvases from Firestore → Supabase
 *
 * Prefer the combined script (also migrates tasks + legacy_firebase_id):
 *   node scripts/restore-firebase-workspaces-tasks.mjs [--dry-run]
 *
 * Firestore schema: { userId (Firebase UID), emoji, title, blocks[], created, updated }
 * Supabase schema:  { id (UUID), title, content (JSONB), owner_id (UUID FK→profiles.id),
 *                     is_shared, emoji, user_id_legacy, created_at, updated_at }
 *
 * Usage:
 *   source .env.local && node scripts/restore-canvases.mjs [--dry-run]
 */
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, 'firebase-service-account.json'), 'utf8'));

const DRY_RUN = process.argv.includes('--dry-run');

// ── Firebase ────────────────────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const firestore = admin.firestore();
firestore.settings({ preferRest: true });

// ── Supabase ────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Set REACT_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── Helpers ─────────────────────────────────────────────────────────────
function fireTimestamp(ts) {
  if (!ts) return null;
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return null;
}

async function buildUidToEmailMap() {
  // Use approved_users collection which has both email and uid fields
  const snap = await firestore.collection('approved_users').get();
  const map = {};
  snap.forEach(doc => {
    const d = doc.data();
    if (d.uid && d.email) {
      map[d.uid] = d.email.toLowerCase();
    }
  });
  return map;
}

async function resolveEmailToSupabaseId(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();
  if (error || !data) return null;
  return data.id;
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎨 Restoring canvases from Firestore → Supabase ${DRY_RUN ? '[DRY RUN]' : ''}\n`);

  // 1. Fetch all canvases from Firestore
  const snap = await firestore.collection('canvases').get();
  console.log(`Found ${snap.size} canvases in Firestore\n`);

  if (snap.size === 0) {
    console.log('Nothing to migrate.');
    process.exit(0);
  }

  // 2. Build UID → email map from Firestore approved_users collection
  console.log('Building UID → email map from approved_users...');
  const uidToEmail = await buildUidToEmailMap();
  console.log('UID → Email map:', uidToEmail);

  // 3. Build email → Supabase profile ID map
  const uniqueEmails = [...new Set(Object.values(uidToEmail).filter(Boolean))];
  console.log(`\nResolving ${uniqueEmails.length} emails to Supabase profile IDs...`);
  const emailToProfileId = {};
  for (const email of uniqueEmails) {
    emailToProfileId[email] = await resolveEmailToSupabaseId(email);
  }
  console.log('Email → Profile ID map:', emailToProfileId);

  // 4. Transform and insert
  const rows = [];
  const skipped = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const uid = d.userId;
    const email = uidToEmail[uid];
    const ownerId = email ? emailToProfileId[email] : null;

    if (!ownerId) {
      skipped.push({ id: doc.id, title: d.title, reason: `No Supabase profile for UID=${uid} email=${email}` });
      continue;
    }

    rows.push({
      title: d.title || 'Untitled',
      content: d.blocks || [],
      owner_id: ownerId,
      is_shared: d.isShared || false,
      emoji: d.emoji || '📝',
      user_id_legacy: uid,
      shared_with: d.sharedWith || [],
      history: d.history || [],
      created_at: fireTimestamp(d.created) || new Date().toISOString(),
      updated_at: fireTimestamp(d.updated) || new Date().toISOString(),
    });
  }

  console.log(`\n✅ ${rows.length} canvases ready to insert`);
  if (skipped.length > 0) {
    console.log(`⚠️  ${skipped.length} skipped:`);
    skipped.forEach(s => console.log(`   - "${s.title}" (${s.reason})`));
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would insert:');
    rows.forEach(r => console.log(`  "${r.title}" → owner=${r.owner_id} blocks=${r.content.length}`));
    process.exit(0);
  }

  // 5. Insert into Supabase (upsert by user_id_legacy to prevent duplicates on re-run)
  // Since there's no unique constraint on user_id_legacy, we check for existing first
  const { data: existing } = await supabase.from('canvases').select('user_id_legacy, title');
  const existingSet = new Set((existing || []).map(e => `${e.user_id_legacy}:${e.title}`));

  const toInsert = rows.filter(r => !existingSet.has(`${r.user_id_legacy}:${r.title}`));
  const alreadyExists = rows.length - toInsert.length;

  if (alreadyExists > 0) {
    console.log(`\n⏭️  ${alreadyExists} canvases already in Supabase (skipping)`);
  }

  if (toInsert.length === 0) {
    console.log('\nNothing new to insert.');
    process.exit(0);
  }

  console.log(`\n📥 Inserting ${toInsert.length} canvases...`);
  const { data: inserted, error } = await supabase.from('canvases').insert(toInsert).select('id, title');
  if (error) {
    console.error('❌ Insert error:', error);
    process.exit(1);
  }

  console.log(`\n✅ Successfully inserted ${inserted.length} canvases:`);
  inserted.forEach(c => console.log(`  ✓ "${c.title}" (${c.id})`));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
