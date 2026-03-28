#!/usr/bin/env node
/**
 * Quick check: compare canvas data in Firestore vs Supabase
 */
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, 'firebase-service-account.json'), 'utf8'));

// Firebase
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const firestore = admin.firestore();
firestore.settings({ preferRest: true });

// Supabase
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://qbhimpuzhvgltgplpoji.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function main() {
  // Check Firestore canvases
  console.log('=== FIRESTORE CANVASES ===');
  const snap = await firestore.collection('canvases').get();
  console.log(`Total documents: ${snap.size}`);
  snap.forEach(doc => {
    const d = doc.data();
    const blockCount = Array.isArray(d.blocks) ? d.blocks.length : (Array.isArray(d.content) ? d.content.length : 0);
    console.log(`  [${doc.id}] title="${d.title || 'Untitled'}" owner=${d.ownerEmail || d.createdBy || 'unknown'} blocks=${blockCount} shared=${d.isShared || false}`);
  });

  // Also check subcollections - canvases might have nested data
  if (snap.size > 0) {
    const firstDoc = snap.docs[0];
    const subcols = await firstDoc.ref.listCollections();
    if (subcols.length > 0) {
      console.log(`\n  Subcollections on first canvas: ${subcols.map(s => s.id).join(', ')}`);
    }
  }

  // Check Supabase canvases
  console.log('\n=== SUPABASE CANVASES ===');
  const { data, error, count } = await supabase.from('canvases').select('*', { count: 'exact' });
  if (error) {
    console.log(`Error: ${error.message}`);
  } else {
    console.log(`Total rows: ${data.length}`);
    data.forEach(row => {
      const blockCount = Array.isArray(row.content) ? row.content.length : 0;
      console.log(`  [${row.id}] title="${row.title}" owner_id=${row.owner_id} blocks=${blockCount} shared=${row.is_shared}`);
    });
  }

  // Also check canvas_form_responses
  const { data: responses, error: respErr } = await supabase.from('canvas_form_responses').select('*', { count: 'exact' });
  if (!respErr) {
    console.log(`\n=== SUPABASE CANVAS_FORM_RESPONSES: ${responses.length} rows ===`);
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
