/**
 * restore-client-assignments.mjs
 * Copies assignedManager (email) from Firebase clients → Supabase clients.assigned_manager
 * Run from project root:  node scripts/restore-client-assignments.mjs
 */

import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = '/sessions/brave-gracious-noether/mnt/uploads/ec93b0a0-a166-4060-8f0a-b23adc65edad-1774456889582_luxury-listings-portal-e56de-firebase-adminsdk-fbsvc-3dd2b9fd56.json';
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const SUPABASE_URL = 'https://wcqlzxfpqsyoyrxljvjf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWx6eGZwcXN5b3lyeGxqdmpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjA1ODk4MCwiZXhwIjoyMDYxNjM0OTgwfQ.HqHDLBkAHJdbUEFOFVGSW_iUJlioiJ-VXLO0FSGKNOQ';
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ts = () => new Date().toISOString();

async function main() {
  console.log('📥 Fetching client assignments from Firebase...');
  const snap = await db.collection('clients').get();

  const assignments = [];
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (data.assignedManager) {
      assignments.push({
        firebaseId: doc.id,
        name: data.clientName || data.name || '(unknown)',
        assignedManager: data.assignedManager,
        assignedManagerName: data.assignedManagerName || null,
      });
    }
  });

  console.log(`Found ${assignments.length} clients with assigned managers in Firebase\n`);

  // Fetch all Supabase clients to match by firebase legacy ID or name
  const { data: sbClients, error: fetchErr } = await sb
    .from('clients')
    .select('id, client_name, client_id_legacy, assigned_manager');

  if (fetchErr) { console.error('Failed to fetch Supabase clients:', fetchErr.message); process.exit(1); }
  console.log(`Supabase has ${sbClients.length} clients total\n`);

  // Build lookup: firebase_id → supabase row, and name → supabase row (fallback)
  const byFirebaseId = {};
  const byName = {};
  sbClients.forEach(c => {
    if (c.client_id_legacy) byFirebaseId[c.client_id_legacy] = c;
    if (c.client_name) byName[c.client_name.toLowerCase().trim()] = c;
  });

  let updated = 0;
  let notFound = 0;

  for (const { firebaseId, name, assignedManager, assignedManagerName } of assignments) {
    // Match by Firebase legacy ID first, fall back to name
    const sbClient = byFirebaseId[firebaseId] || byName[name.toLowerCase().trim()];

    if (!sbClient) {
      console.warn(`  ? Not found in Supabase: "${name}" (Firebase ID: ${firebaseId})`);
      notFound++;
      continue;
    }

    const { error } = await sb
      .from('clients')
      .update({ assigned_manager: assignedManager, updated_at: ts() })
      .eq('id', sbClient.id);

    if (error) {
      console.error(`  ✗ ${name}:`, error.message);
      notFound++;
    } else {
      console.log(`  ✓ "${name}" → ${assignedManager}${assignedManagerName ? ` (${assignedManagerName})` : ''}`);
      updated++;
    }
  }

  console.log(`\n✅ Done. Updated: ${updated} / Not found/Errors: ${notFound}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
