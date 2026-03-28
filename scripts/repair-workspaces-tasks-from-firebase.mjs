#!/usr/bin/env node
/**
 * 1) Sync canvas content/history from Firestore (source of truth)
 * 2) Deduplicate Supabase canvases per Firestore doc (legacy id + title/owner match)
 * 3) Upsert tasks: update existing by legacy_firebase_id, insert missing
 *
 * Requires: Firebase Admin creds + SUPABASE_SERVICE_ROLE_KEY (same as restore-firebase-workspaces-tasks.mjs)
 *
 * Usage:
 *   source .env.local && node scripts/repair-workspaces-tasks-from-firebase.mjs [--dry-run]
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || join(__dirname, 'firebase-service-account.json');
  if (!existsSync(p)) {
    console.error('❌ Firebase credentials missing (JSON env or scripts/firebase-service-account.json)');
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
}
const firestore = admin.firestore();
firestore.settings({ preferRest: true });

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Set REACT_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function fireTs(val) {
  if (!val) return null;
  if (val._seconds != null) return new Date(val._seconds * 1000).toISOString();
  if (val.seconds != null) return new Date(val.seconds * 1000).toISOString();
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return null;
}

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

function normTitle(t) {
  return String(t || 'Untitled')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function blockLen(content) {
  if (!content) return 0;
  if (Array.isArray(content)) return content.length;
  if (typeof content === 'string') {
    try {
      const p = JSON.parse(content);
      return Array.isArray(p) ? p.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

function sharedEmailsFromCanvas(d) {
  const raw = d.sharedWithEmails || d.sharedWith || [];
  if (Array.isArray(raw)) {
    return raw.map((x) => (typeof x === 'string' ? x : x?.email || '').toLowerCase()).filter(Boolean);
  }
  return [];
}

async function buildFirebaseUidToOwnerId() {
  const map = {};
  const { data: profiles, error } = await supabase.from('profiles').select('id, uid, email');
  if (error) console.warn('profiles:', error.message);
  for (const p of profiles || []) {
    if (p.uid) map[p.uid] = p.id;
  }
  try {
    const snap = await firestore.collection('approved_users').get();
    snap.forEach((doc) => {
      const d = doc.data();
      const email = (doc.id || d.email || '').toLowerCase().trim();
      if (!d.uid || !email) return;
      const hit = (profiles || []).find((x) => (x.email || '').toLowerCase() === email);
      if (hit) map[d.uid] = hit.id;
    });
  } catch (e) {
    console.warn('approved_users:', e.message);
  }
  return map;
}

function firestoreCanvasRow(fsId, d, ownerId, uid) {
  const emails = sharedEmailsFromCanvas(d);
  const blocksRaw = Array.isArray(d.blocks) ? d.blocks : (Array.isArray(d.content) ? d.content : []);
  return {
    title: d.title || 'Untitled',
    content: sanitizeForJson(blocksRaw),
    owner_id: ownerId,
    is_shared: !!(d.isShared || emails.length),
    emoji: d.emoji || '📝',
    user_id_legacy: uid,
    shared_with: Array.isArray(d.sharedWith) ? d.sharedWith : [],
    shared_with_emails: emails,
    history: Array.isArray(d.history) ? sanitizeForJson(d.history) : [],
    legacy_firebase_id: fsId,
    created_at: fireTs(d.created) || fireTs(d.createdAt) || undefined,
    updated_at: fireTs(d.updated) || fireTs(d.updatedAt) || new Date().toISOString(),
  };
}

function pickKeeper(rows, fsId) {
  const withMatch = rows.filter((r) => r.legacy_firebase_id === fsId);
  const pool = withMatch.length ? withMatch : rows;
  return pool.reduce((best, r) => (blockLen(r.content) > blockLen(best.content) ? r : best), pool[0]);
}

async function reassignCanvasChildren(loserId, keeperId) {
  const { error: hErr } = await supabase.from('canvas_history').update({ canvas_id: keeperId }).eq('canvas_id', loserId);
  if (hErr) console.warn('canvas_history reassign:', hErr.message);

  const { data: loserComments } = await supabase.from('canvas_block_comments').select('*').eq('canvas_id', loserId);
  for (const row of loserComments || []) {
    const { data: existing } = await supabase
      .from('canvas_block_comments')
      .select('id, comments, reactions')
      .eq('canvas_id', keeperId)
      .eq('block_id', row.block_id)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from('canvas_block_comments').update({ canvas_id: keeperId }).eq('id', row.id);
      if (error) console.warn('block_comments move:', error.message);
    } else {
      const mergedComments = [...(existing.comments || []), ...(row.comments || [])];
      const mergedReactions = [...(existing.reactions || []), ...(row.reactions || [])];
      await supabase
        .from('canvas_block_comments')
        .update({ comments: mergedComments, reactions: mergedReactions })
        .eq('id', existing.id);
      await supabase.from('canvas_block_comments').delete().eq('id', row.id);
    }
  }

  const { error: fErr } = await supabase.from('canvas_form_responses').update({ canvas_id: keeperId }).eq('canvas_id', loserId);
  if (fErr) console.warn('canvas_form_responses:', fErr.message);
}

async function deleteCanvasRow(id) {
  const { error } = await supabase.from('canvases').delete().eq('id', id);
  if (error) throw error;
}

// ─── Tasks (same field mapping as restore-firebase-workspaces-tasks.mjs) ───
const TASK_TOP_LEVEL = new Set([
  'title', 'description', 'status', 'priority', 'source', 'assigned_to', 'assigned_by',
  'task_type', 'clientId', 'client_id_legacy', 'taskRequestId', 'task_request_id',
  'due_date', 'due_time', 'completed_date', 'post_date', 'platform', 'post_url',
  'createdAt', 'updatedAt', 'created_date', 'last_modified',
]);

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

function strField(val) {
  if (val == null) return null;
  if (typeof val === 'string') return val;
  return fireTs(val) || strDate(val);
}

function mapFirestoreTask(docId, raw) {
  const meta = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!TASK_TOP_LEVEL.has(k)) meta[k] = sanitizeForJson(v);
  }
  return {
    title: raw.title || 'Untitled Task',
    description: raw.description ?? null,
    status: normalizeStatus(raw.status),
    priority: mapPriority(raw.priority),
    source: raw.source || 'task',
    assigned_to: raw.assigned_to ? String(raw.assigned_to).toLowerCase().trim() : null,
    assigned_by: raw.assigned_by ? String(raw.assigned_by).toLowerCase().trim() : null,
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
    legacy_firebase_id: docId,
    created_at: fireTs(raw.createdAt) || fireTs(raw.created_date) || undefined,
    updated_at: fireTs(raw.updatedAt) || fireTs(raw.last_modified) || new Date().toISOString(),
  };
}

function fsUpdatedMs(d) {
  const t = fireTs(d.updated) || fireTs(d.updatedAt) || fireTs(d.created) || fireTs(d.createdAt);
  return t ? new Date(t).getTime() : 0;
}

function sbUpdatedMs(r) {
  if (!r.updated_at) return 0;
  return new Date(r.updated_at).getTime();
}

/**
 * Build groups: each key = Firestore canvas doc id. Rows with legacy_firebase_id join that group.
 * Rows without legacy join at most one group: best FS doc match by owner+uid+title, tie-break by updated_at proximity.
 */
function buildCanvasGroups(rows, fsDocs, uidToOwnerId) {
  /** @type {Map<string, { fsId: string, d: object, ownerId: string, uid: string, rows: object[] }>} */
  const groups = new Map();

  for (const { id: fsId, d } of fsDocs) {
    const uid = d.userId;
    const ownerId = uid ? uidToOwnerId[uid] : null;
    if (!ownerId) continue;
    groups.set(fsId, { fsId, d, ownerId, uid, rows: [] });
  }

  const assigned = new Set();

  for (const r of rows) {
    if (!r.legacy_firebase_id) continue;
    const g = groups.get(r.legacy_firebase_id);
    if (g) {
      g.rows.push(r);
      assigned.add(r.id);
    }
  }

  const orphans = rows.filter((r) => !r.legacy_firebase_id && !assigned.has(r.id));

  for (const r of orphans) {
    const uid = r.user_id_legacy;
    const ownerId = r.owner_id;
    if (!uid || !ownerId) continue;

    const titleN = normTitle(r.title);
    const candidates = fsDocs.filter(({ id: fsId, d }) => {
      const g = groups.get(fsId);
      if (!g) return false;
      return g.ownerId === ownerId && g.uid === uid && normTitle(d.title) === titleN;
    });

    if (candidates.length === 0) continue;
    let best = candidates[0];
    if (candidates.length > 1) {
      const t0 = sbUpdatedMs(r);
      best = candidates.reduce((a, b) => {
        const da = Math.abs(fsUpdatedMs(a.d) - t0);
        const db = Math.abs(fsUpdatedMs(b.d) - t0);
        return db < da ? b : a;
      });
    }
    groups.get(best.id).rows.push(r);
    assigned.add(r.id);
  }

  return { groups, assignedIds: assigned };
}

async function repairCanvases(uidToOwnerId, fsDocs) {
  const { data: allRows, error } = await supabase.from('canvases').select('*');
  if (error) throw error;
  const rows = allRows || [];

  const { groups, assignedIds } = buildCanvasGroups(rows, fsDocs, uidToOwnerId);

  const toDeleteLosers = [];
  let updated = 0;
  let inserted = 0;
  let deleted = 0;

  for (const { id: fsId, d } of fsDocs) {
    const uid = d.userId;
    const ownerId = uid ? uidToOwnerId[uid] : null;
    if (!ownerId) {
      console.warn(`   skip canvas FS ${fsId}: no profile for uid ${uid}`);
      continue;
    }

    const patch = firestoreCanvasRow(fsId, d, ownerId, uid);
    const g = groups.get(fsId);
    const groupRows = g?.rows || [];

    if (groupRows.length === 0) {
      if (DRY_RUN) {
        console.log(`   [dry-run] INSERT canvas "${patch.title}" legacy=${fsId}`);
        inserted += 1;
      } else {
        const insertPayload = {
          ...patch,
          created_at: patch.created_at || new Date().toISOString(),
        };
        const { error: insErr } = await supabase.from('canvases').insert([insertPayload]);
        if (insErr) console.error('   insert', fsId, insErr.message);
        else inserted += 1;
      }
      continue;
    }

    const keeper = pickKeeper(groupRows, fsId);
    const { created_at: _c, ...updateFields } = patch;

    if (DRY_RUN) {
      console.log(
        `   [dry-run] UPDATE ${keeper.id} ← FS ${fsId} "${patch.title}" blocks=${blockLen(patch.content)} (dedupe ${groupRows.length})`
      );
      updated += 1;
    } else {
      const { error: upErr } = await supabase.from('canvases').update(updateFields).eq('id', keeper.id);
      if (upErr) console.error('   update', keeper.id, upErr.message);
      else updated += 1;
    }

    for (const r of groupRows) {
      if (r.id !== keeper.id) toDeleteLosers.push({ loser: r.id, keeper: keeper.id });
    }
  }

  // Remaining duplicates: same owner+uid+title, no Firestore doc (deleted in Firebase) or orphan collision
  const unmatched = rows.filter((r) => !assignedIds.has(r.id));
  const byKey = new Map();
  for (const r of unmatched) {
    const k = `${r.owner_id}|${r.user_id_legacy || ''}|${normTitle(r.title)}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  }
  for (const [, grp] of byKey) {
    if (grp.length < 2) continue;
    const keeper = pickKeeper(grp, null);
    for (const r of grp) {
      if (r.id !== keeper.id) toDeleteLosers.push({ loser: r.id, keeper: keeper.id });
    }
  }

  const seen = new Set();
  for (const { loser, keeper } of toDeleteLosers) {
    const key = `${loser}->${keeper}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (loser === keeper) continue;
    if (DRY_RUN) {
      console.log(`   [dry-run] DELETE duplicate canvas ${loser} (keep ${keeper})`);
      deleted += 1;
    } else {
      await reassignCanvasChildren(loser, keeper);
      await deleteCanvasRow(loser);
      deleted += 1;
    }
  }

  return { updated, inserted, deleted };
}

async function repairTasks(fsTaskDocs) {
  let updated = 0;
  let inserted = 0;

  const { data: existingRows } = await supabase.from('tasks').select('id, legacy_firebase_id');
  const legacyToId = new Map();
  for (const r of existingRows || []) {
    if (r.legacy_firebase_id) legacyToId.set(r.legacy_firebase_id, r.id);
  }

  const chunkUpsert = [];
  for (const { id: docId, raw } of fsTaskDocs) {
    const row = mapFirestoreTask(docId, raw);
    const existingId = legacyToId.get(docId);
    if (existingId) {
      if (DRY_RUN) updated += 1;
      else {
        const { created_at: _cr, ...upd } = row;
        const { error } = await supabase.from('tasks').update(upd).eq('id', existingId);
        if (error) console.warn('task update', docId, error.message);
        else updated += 1;
      }
    } else {
      chunkUpsert.push({
        ...row,
        created_at: row.created_at || new Date().toISOString(),
      });
    }
  }

  if (!DRY_RUN && chunkUpsert.length) {
    const CH = 100;
    for (let i = 0; i < chunkUpsert.length; i += CH) {
      const part = chunkUpsert.slice(i, i + CH);
      const { error } = await supabase.from('tasks').insert(part);
      if (error) {
        console.error('tasks insert chunk:', error.message);
        throw error;
      }
      inserted += part.length;
    }
  } else if (DRY_RUN) {
    inserted = chunkUpsert.length;
  }

  return { updated, inserted };
}

async function main() {
  console.log(`\n🔧 Repair workspaces + tasks from Firebase ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

  const uidToOwnerId = await buildFirebaseUidToOwnerId();
  console.log(`UID → profile map: ${Object.keys(uidToOwnerId).length} entries\n`);

  const canvasSnap = await firestore.collection('canvases').get();
  const fsDocs = canvasSnap.docs.map((doc) => ({ id: doc.id, d: doc.data() }));
  console.log(`Firestore canvases: ${fsDocs.length}`);

  const canvasStats = await repairCanvases(uidToOwnerId, fsDocs);
  console.log('\nCanvases:', canvasStats);

  const taskSnap = await firestore.collection('tasks').get();
  const fsTaskDocs = taskSnap.docs.map((doc) => ({ id: doc.id, raw: doc.data() }));
  console.log(`\nFirestore tasks: ${fsTaskDocs.length}`);

  const taskStats = await repairTasks(fsTaskDocs);
  console.log('\nTasks:', taskStats);
  console.log('\nDone.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
