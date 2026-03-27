#!/usr/bin/env node
/**
 * Restore Workspaces (canvases) + Tasks from Firestore → Supabase
 *
 * Prerequisites:
 *   - Firebase Admin SDK key: place `scripts/firebase-service-account.json` OR set
 *     FIREBASE_SERVICE_ACCOUNT_JSON to the raw JSON string OR FIREBASE_SERVICE_ACCOUNT_PATH
 *   - Supabase: REACT_APP_SUPABASE_URL or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Applies migration 019 (legacy_firebase_id columns) before running if missing.
 *
 * Usage:
 *   source .env.local && node scripts/restore-firebase-workspaces-tasks.mjs [--dry-run] [--canvases-only] [--tasks-only]
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DRY_RUN = process.argv.includes('--dry-run');
const CANVASES_ONLY = process.argv.includes('--canvases-only');
const TASKS_ONLY = process.argv.includes('--tasks-only');

// ── Firebase Admin ────────────────────────────────────────────
function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || join(__dirname, 'firebase-service-account.json');
  if (!existsSync(p)) {
    console.error('❌ No Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or add scripts/firebase-service-account.json');
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
}
const firestore = admin.firestore();
firestore.settings({ preferRest: true });

// ── Supabase (service role = bypass RLS for migration) ─────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Set REACT_APP_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── Helpers ───────────────────────────────────────────────────
function fireTs(val) {
  if (!val) return null;
  if (val._seconds != null) return new Date(val._seconds * 1000).toISOString();
  if (val.seconds != null) return new Date(val.seconds * 1000).toISOString();
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return null;
}

function mapPriority(p) {
  if (typeof p === 'number' && Number.isFinite(p)) return Math.min(4, Math.max(1, Math.round(p)));
  const m = { urgent: 4, high: 3, medium: 2, low: 1 };
  if (typeof p === 'string' && m[p.toLowerCase()] != null) return m[p.toLowerCase()];
  return 2;
}

function normalizeStatus(s) {
  if (!s || typeof s !== 'string') return 'todo';
  const x = s.toLowerCase();
  if (['todo', 'pending', 'in_progress', 'completed', 'cancelled', 'deferred'].includes(x)) return x === 'pending' ? 'pending' : x;
  return 'todo';
}

function strDate(val) {
  if (!val) return null;
  if (typeof val === 'string') return val.length > 10 ? val.split('T')[0] : val;
  const iso = fireTs(val);
  return iso ? iso.split('T')[0] : null;
}

/** DATE columns and free-form TEXT date fields */
function strField(val) {
  if (val == null) return null;
  if (typeof val === 'string') return val;
  return fireTs(val) || strDate(val);
}

/** Firestore Timestamp / nested objects → JSON-safe */
function sanitizeForJson(obj) {
  if (obj == null) return obj;
  if (obj._seconds != null || obj.seconds != null) return fireTs(obj);
  if (typeof obj.toDate === 'function') return fireTs(obj);
  if (Array.isArray(obj)) return obj.map((x) => sanitizeForJson(x));
  if (typeof obj === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(obj)) o[k] = sanitizeForJson(v);
    return o;
  }
  return obj;
}

/** UID (Firebase) → Supabase profiles.id */
async function buildFirebaseUidToOwnerId() {
  const map = {};
  const { data: profiles, error } = await supabase.from('profiles').select('id, uid, email');
  if (error) {
    console.warn('⚠️ profiles select:', error.message);
    return map;
  }
  for (const p of profiles || []) {
    if (p.uid) map[p.uid] = p.id;
  }

  // Enrich from Firestore approved_users (uid + email)
  try {
    const snap = await firestore.collection('approved_users').get();
    snap.forEach((doc) => {
      const d = doc.data();
      const email = (doc.id || d.email || '').toLowerCase().trim();
      if (!d.uid || !email) return;
      const hit = (profiles || []).find((x) => x.email === email);
      if (hit) map[d.uid] = hit.id;
    });
  } catch (e) {
    console.warn('⚠️ approved_users scan:', e.message);
  }
  return map;
}

async function existingLegacyIds(table) {
  const { data } = await supabase.from(table).select('legacy_firebase_id').not('legacy_firebase_id', 'is', null);
  return new Set((data || []).map((r) => r.legacy_firebase_id).filter(Boolean));
}

function sharedEmailsFromCanvas(d) {
  const raw = d.sharedWithEmails || d.sharedWith || [];
  if (Array.isArray(raw)) {
    return raw.map((x) => (typeof x === 'string' ? x : x?.email || '').toLowerCase()).filter(Boolean);
  }
  return [];
}

// ── Canvases ──────────────────────────────────────────────────
async function restoreCanvases(uidToOwnerId, already) {
  const snap = await firestore.collection('canvases').get();
  console.log(`\n📁 Firestore canvases: ${snap.size} documents`);

  const rows = [];
  const skipped = [];

  for (const doc of snap.docs) {
    const id = doc.id;
    if (already.has(id)) {
      skipped.push({ id, reason: 'already in Supabase (legacy_firebase_id)' });
      continue;
    }

    const d = doc.data();
    const uid = d.userId;
    const ownerId = uid ? uidToOwnerId[uid] : null;
    if (!ownerId) {
      skipped.push({ id, title: d.title, reason: `no profile for Firebase UID=${uid}` });
      continue;
    }

    const emails = sharedEmailsFromCanvas(d);
    const blocksRaw = Array.isArray(d.blocks) ? d.blocks : (Array.isArray(d.content) ? d.content : []);
    rows.push({
      title: d.title || 'Untitled',
      content: sanitizeForJson(blocksRaw),
      owner_id: ownerId,
      is_shared: !!(d.isShared || emails.length),
      emoji: d.emoji || '📝',
      user_id_legacy: uid,
      shared_with: Array.isArray(d.sharedWith) ? d.sharedWith : [],
      shared_with_emails: emails,
      history: Array.isArray(d.history) ? d.history : [],
      legacy_firebase_id: id,
      created_at: fireTs(d.created) || fireTs(d.createdAt) || new Date().toISOString(),
      updated_at: fireTs(d.updated) || fireTs(d.updatedAt) || new Date().toISOString(),
    });
  }

  console.log(`   → ${rows.length} to insert, ${skipped.length} skipped`);
  if (skipped.length && skipped.length <= 30) skipped.forEach((s) => console.log(`      skip ${s.id}: ${s.reason}`));
  else if (skipped.length) console.log(`      (first skip reason: ${skipped[0].reason})`);

  if (DRY_RUN || rows.length === 0) return { inserted: 0, skipped };

  const chunk = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await supabase.from('canvases').insert(part);
    if (error) {
      console.error('❌ canvases insert:', error.message, error.details || '');
      throw error;
    }
    inserted += part.length;
  }
  console.log(`   ✅ Inserted ${inserted} canvases`);
  return { inserted, skipped };
}

// ── Tasks ─────────────────────────────────────────────────────
/** Top-level task fields stored in dedicated columns (rest → meta JSONB) */
const TASK_TOP_LEVEL = new Set([
  'title', 'description', 'status', 'priority', 'source', 'assigned_to', 'assigned_by',
  'task_type', 'clientId', 'client_id_legacy', 'taskRequestId', 'task_request_id',
  'due_date', 'due_time', 'completed_date', 'post_date', 'platform', 'post_url',
  'createdAt', 'updatedAt', 'created_date', 'last_modified',
]);

async function restoreTasks(already) {
  const snap = await firestore.collection('tasks').get();
  console.log(`\n📋 Firestore tasks: ${snap.size} documents`);

  const rows = [];
  const skipped = [];

  for (const doc of snap.docs) {
    const id = doc.id;
    if (already.has(id)) {
      skipped.push({ id, reason: 'already migrated' });
      continue;
    }

    const raw = doc.data();
    const meta = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!TASK_TOP_LEVEL.has(k)) meta[k] = sanitizeForJson(v);
    }

    const title = raw.title || 'Untitled Task';
    const assigned_to = raw.assigned_to ? String(raw.assigned_to).toLowerCase().trim() : null;
    const assigned_by = raw.assigned_by ? String(raw.assigned_by).toLowerCase().trim() : null;

    const row = {
      title,
      description: raw.description ?? null,
      status: normalizeStatus(raw.status),
      priority: mapPriority(raw.priority),
      source: raw.source || 'task',
      assigned_to,
      assigned_by,
      task_type: raw.task_type || null,
      client_id_legacy: raw.clientId || raw.client_id_legacy || null,
      task_request_id: raw.taskRequestId || raw.task_request_id || null,
      due_date: strDate(raw.due_date),
      due_time: raw.due_time != null ? String(raw.due_time) : null,
      completed_date: strField(raw.completed_date),
      post_date: strField(raw.post_date),
      platform: raw.platform || null,
      post_url: raw.post_url || null,
      meta: Object.keys(meta).length ? meta : {},
      legacy_firebase_id: id,
      created_at: fireTs(raw.createdAt) || fireTs(raw.created_date) || new Date().toISOString(),
      updated_at: fireTs(raw.updatedAt) || fireTs(raw.last_modified) || new Date().toISOString(),
    };

    rows.push(row);
  }

  console.log(`   → ${rows.length} to insert, ${skipped.length} already present`);

  if (DRY_RUN || rows.length === 0) return { inserted: 0, skipped };

  const chunk = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await supabase.from('tasks').insert(part);
    if (error) {
      console.error('❌ tasks insert:', error.message, error.details || '', error.hint || '');
      throw error;
    }
    inserted += part.length;
  }
  console.log(`   ✅ Inserted ${inserted} tasks`);
  return { inserted, skipped };
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔁 Firebase → Supabase restore ${DRY_RUN ? '[DRY RUN]' : ''}\n`);

  const uidToOwnerId = await buildFirebaseUidToOwnerId();
  console.log(`Firebase UID → profile id map: ${Object.keys(uidToOwnerId).length} entries`);

  let canvasExisting = new Set();
  let taskExisting = new Set();
  if (!DRY_RUN) {
    canvasExisting = await existingLegacyIds('canvases');
    taskExisting = await existingLegacyIds('tasks');
    console.log(`Already migrated: ${canvasExisting.size} canvases, ${taskExisting.size} tasks (by legacy_firebase_id)`);
  }

  const out = { canvases: null, tasks: null };

  if (!TASKS_ONLY) {
    out.canvases = await restoreCanvases(uidToOwnerId, canvasExisting);
  }
  if (!CANVASES_ONLY) {
    out.tasks = await restoreTasks(taskExisting);
  }

  console.log('\nDone.', DRY_RUN ? '(dry run — no writes)' : '');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
