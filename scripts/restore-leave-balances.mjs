/**
 * restore-leave-balances.mjs
 * Copies leaveBalances from Firebase approved_users → Supabase profiles.leave_balances
 * Run from project root:  node scripts/restore-leave-balances.mjs
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
  console.log('📥 Fetching leave balances from Firebase...');
  const snap = await db.collection('approved_users').get();

  const firebaseBalances = [];
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (data.leaveBalances) {
      firebaseBalances.push({ email: doc.id, leaveBalances: data.leaveBalances });
    }
  });

  console.log(`Found ${firebaseBalances.length} users with leave balance data in Firebase`);

  let updated = 0;
  let skipped = 0;

  for (const { email, leaveBalances } of firebaseBalances) {
    // Normalize: compute remaining from total - used, handle nulls
    const normalize = (type, defaults) => {
      const lb = leaveBalances[type] || {};
      const total = lb.total ?? defaults.total;
      const used = lb.used ?? 0;
      return { total, used, remaining: Math.max(0, total - used) };
    };

    const normalized = {
      vacation: normalize('vacation', { total: 15 }),
      sick: normalize('sick', { total: 3 }),
      remote: normalize('remote', { total: 10 }),
    };

    const { error } = await sb
      .from('profiles')
      .update({ leave_balances: normalized, updated_at: ts() })
      .ilike('email', email);

    if (error) {
      console.error(`  ✗ ${email}:`, error.message);
      skipped++;
    } else {
      console.log(`  ✓ ${email} — vacation: ${normalized.vacation.remaining}/${normalized.vacation.total} remaining, sick: ${normalized.sick.remaining}/${normalized.sick.total}`);
      updated++;
    }
  }

  console.log(`\n✅ Done. Updated: ${updated} / Skipped/Errors: ${skipped}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
