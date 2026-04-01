#!/usr/bin/env node
/**
 * Migrate Firestore canvases/{id}/block_comments/{blockId} → Supabase canvas_block_comments
 *
 * Standalone script — runs only the block-comments pass without touching canvases or tasks.
 * Canvases must already be in Supabase (with legacy_firebase_id set) before running this.
 *
 * Usage:
 *   source .env.local && node scripts/migrate-block-comments-from-firebase.mjs [--dry-run]
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

// ── Firebase Admin ────────────────────────────────────────────
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

// ── Supabase ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Set REACT_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
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

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log(`\n💬 Migrate block comments from Firebase ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

  // Build Firestore canvas id → Supabase canvas UUID map
  const { data: sbCanvases, error: sbErr } = await supabase
    .from('canvases')
    .select('id, legacy_firebase_id')
    .not('legacy_firebase_id', 'is', null);
  if (sbErr) throw sbErr;

  const fsIdToSbId = new Map();
  for (const r of sbCanvases || []) {
    if (r.legacy_firebase_id) fsIdToSbId.set(r.legacy_firebase_id, r.id);
  }
  console.log(`Supabase canvases with legacy_firebase_id: ${fsIdToSbId.size}`);

  const canvasSnap = await firestore.collection('canvases').get();
  console.log(`Firestore canvases to scan: ${canvasSnap.size}\n`);

  let upserted = 0;
  let skipped = 0;
  let errored = 0;
  let canvasesWithComments = 0;

  for (const canvasDoc of canvasSnap.docs) {
    const fsId = canvasDoc.id;
    const sbCanvasId = fsIdToSbId.get(fsId);
    if (!sbCanvasId) {
      continue; // Canvas not in Supabase
    }

    let bcSnap;
    try {
      bcSnap = await firestore.collection('canvases').doc(fsId).collection('block_comments').get();
    } catch (e) {
      console.warn(`   ⚠️ block_comments read ${fsId}:`, e.message);
      errored += 1;
      continue;
    }
    if (bcSnap.empty) continue;

    canvasesWithComments += 1;
    const title = canvasDoc.data().title || 'Untitled';
    console.log(`   📝 "${title}" (${fsId}): ${bcSnap.size} block(s) with comments`);

    for (const doc of bcSnap.docs) {
      const blockId = doc.id;
      const data = doc.data();
      const fsComments = sanitizeForJson(data.comments || []);
      const fsReactions = sanitizeForJson(data.reactions || []);

      if (!fsComments.length && !fsReactions.length) {
        skipped += 1;
        continue;
      }

      if (DRY_RUN) {
        console.log(`      [dry-run] UPSERT block=${blockId} comments=${fsComments.length} reactions=${fsReactions.length}`);
        upserted += 1;
        continue;
      }

      // Check existing
      const { data: existing } = await supabase
        .from('canvas_block_comments')
        .select('id, comments, reactions')
        .eq('canvas_id', sbCanvasId)
        .eq('block_id', blockId)
        .maybeSingle();

      if (existing) {
        // Merge: deduplicate comments by id, reactions by emoji+userId
        const existingIds = new Set((existing.comments || []).map((c) => c.id).filter(Boolean));
        const newComments = fsComments.filter((c) => !c.id || !existingIds.has(c.id));
        const mergedComments = [...(existing.comments || []), ...newComments];

        const existingReactionKeys = new Set(
          (existing.reactions || []).map((r) => `${r.emoji}|${r.userId}`)
        );
        const newReactions = fsReactions.filter(
          (r) => !existingReactionKeys.has(`${r.emoji}|${r.userId}`)
        );
        const mergedReactions = [...(existing.reactions || []), ...newReactions];

        const { error } = await supabase
          .from('canvas_block_comments')
          .update({ comments: mergedComments, reactions: mergedReactions, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) {
          console.warn(`      ⚠️ merge ${blockId}:`, error.message);
          errored += 1;
        } else {
          upserted += 1;
        }
      } else {
        const { error } = await supabase
          .from('canvas_block_comments')
          .insert({ canvas_id: sbCanvasId, block_id: blockId, comments: fsComments, reactions: fsReactions });
        if (error) {
          console.warn(`      ⚠️ insert ${blockId}:`, error.message);
          errored += 1;
        } else {
          upserted += 1;
        }
      }
    }
  }

  console.log(`\n✅ Block comments migration complete:`);
  console.log(`   Canvases with comments: ${canvasesWithComments}`);
  console.log(`   Upserted: ${upserted}`);
  console.log(`   Skipped (empty): ${skipped}`);
  console.log(`   Errors: ${errored}`);
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
