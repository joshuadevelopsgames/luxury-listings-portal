#!/usr/bin/env node
/**
 * Firebase → Supabase Data Restore Script
 *
 * Pulls CRM data and Instagram report-client mappings from the old Firebase Firestore
 * and writes them to the Supabase PostgreSQL database.
 *
 * Usage: node scripts/firebase-to-supabase-restore.mjs [--dry-run] [--crm] [--reports]
 *   --dry-run   Show what would be migrated without writing
 *   --crm       Only migrate CRM data
 *   --reports   Only migrate Instagram report-client links
 *   (no flags)  Migrate both
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCNTi85Mc9Bpxiz_B9YKmQHsbkmkpaJzLQ",
  authDomain: "luxury-listings-portal-e56de.firebaseapp.com",
  projectId: "luxury-listings-portal-e56de",
  storageBucket: "luxury-listings-portal-e56de.firebasestorage.app",
  messagingSenderId: "660966083126",
  appId: "1:660966083126:web:ece8041e9d9cc016b7a697"
};

const SUPABASE_URL = 'https://qbhimpuzhvgltgplpoji.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaGltcHV6aHZnbHRncGxwb2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAzNDQzNywiZXhwIjoyMDg5NjEwNDM3fQ.J_ig4hkor-dVq_cQ87H9LCKG39iT3ihOtEd8yCRp8bw';

// ── Initialize ──────────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig, 'migration');
const db = getFirestore(app);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY_CRM = args.includes('--crm');
const ONLY_REPORTS = args.includes('--reports');
const DO_CRM = !ONLY_REPORTS || ONLY_CRM;
const DO_REPORTS = !ONLY_CRM || ONLY_REPORTS;

if (DRY_RUN) console.log('\n🏷️  DRY RUN — no data will be written\n');

// ── CRM Migration ───────────────────────────────────────────────────────────
async function migrateCRM() {
  console.log('═══════════════════════════════════════════');
  console.log('📋 CRM DATA MIGRATION');
  console.log('═══════════════════════════════════════════');

  // Try multiple possible Firestore paths for CRM data
  const paths = [
    { path: 'crm/data', type: 'doc' },
    { path: 'crm_data/crm_main', type: 'doc' },
    { path: 'crm', type: 'collection' },
  ];

  let crmData = null;

  for (const { path, type } of paths) {
    try {
      if (type === 'doc') {
        const [col, docId] = path.split('/');
        const snap = await getDoc(doc(db, col, docId));
        if (snap.exists()) {
          crmData = snap.data();
          console.log(`✅ Found CRM data at Firestore path: ${path}`);
          break;
        } else {
          console.log(`   ⏭️  No data at ${path}`);
        }
      } else {
        const snap = await getDocs(collection(db, path));
        if (!snap.empty) {
          console.log(`✅ Found CRM collection at: ${path} (${snap.size} docs)`);
          // Merge all docs
          crmData = {};
          snap.forEach(d => {
            console.log(`   📄 Doc "${d.id}": ${JSON.stringify(Object.keys(d.data()))}`);
            Object.assign(crmData, d.data());
          });
          break;
        } else {
          console.log(`   ⏭️  Empty collection at ${path}`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Error reading ${path}: ${err.message}`);
    }
  }

  if (!crmData) {
    console.log('\n⚠️  No CRM data found in Firebase. Trying broader search...');
    // Try listing all top-level collections (limited in client SDK)
    // The data might be at a different path
    return;
  }

  const warmLeads = crmData.warmLeads || crmData.warm_leads || [];
  const contactedClients = crmData.contactedClients || crmData.contacted_clients || [];
  const coldLeads = crmData.coldLeads || crmData.cold_leads || [];
  const total = warmLeads.length + contactedClients.length + coldLeads.length;

  console.log(`\n📊 CRM Summary:`);
  console.log(`   Warm leads:        ${warmLeads.length}`);
  console.log(`   Contacted clients: ${contactedClients.length}`);
  console.log(`   Cold leads:        ${coldLeads.length}`);
  console.log(`   Total:             ${total}`);

  if (total === 0) {
    console.log('\n⚠️  CRM data exists but all arrays are empty.');
    return;
  }

  // Show sample data
  if (warmLeads.length > 0) {
    console.log(`\n   Sample warm lead: ${JSON.stringify(warmLeads[0], null, 2).substring(0, 200)}...`);
  }

  if (DRY_RUN) {
    console.log('\n🏷️  DRY RUN — would write CRM data to Supabase crm_data table');
    return;
  }

  // Write to Supabase
  const { data: existing } = await supabase.from('crm_data').select('id').limit(1).maybeSingle();
  const row = {
    warm_leads: warmLeads,
    contacted_clients: contactedClients,
    cold_leads: coldLeads,
    last_sync_time: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from('crm_data').update(row).eq('id', existing.id);
    if (error) throw new Error(`Supabase update failed: ${error.message}`);
    console.log(`\n✅ Updated existing crm_data row (id: ${existing.id}) with ${total} leads`);
  } else {
    const { error } = await supabase.from('crm_data').insert([row]);
    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    console.log(`\n✅ Inserted new crm_data row with ${total} leads`);
  }
}

// ── Instagram Reports Migration ─────────────────────────────────────────────
async function migrateInstagramReports() {
  console.log('\n═══════════════════════════════════════════');
  console.log('📸 INSTAGRAM REPORTS CLIENT LINKING');
  console.log('═══════════════════════════════════════════');

  // Try multiple possible Firestore paths for Instagram reports
  const paths = [
    'instagram_reports',
    'instagramReports',
    'reports',
  ];

  let reports = [];

  for (const path of paths) {
    try {
      const snap = await getDocs(collection(db, path));
      if (!snap.empty) {
        snap.forEach(d => {
          reports.push({ firebaseId: d.id, ...d.data() });
        });
        console.log(`✅ Found ${snap.size} reports at Firestore path: ${path}`);
        break;
      } else {
        console.log(`   ⏭️  Empty collection at ${path}`);
      }
    } catch (err) {
      console.log(`   ❌ Error reading ${path}: ${err.message}`);
    }
  }

  if (reports.length === 0) {
    console.log('\n⚠️  No Instagram reports found in Firebase.');
    return;
  }

  // Analyze client linking
  const withClient = reports.filter(r => r.clientId || r.client_id || r.clientName || r.client_name);
  const withoutClient = reports.filter(r => !r.clientId && !r.client_id && !r.clientName && !r.client_name);

  console.log(`\n📊 Report Summary:`);
  console.log(`   Total reports:       ${reports.length}`);
  console.log(`   With client link:    ${withClient.length}`);
  console.log(`   Without client link: ${withoutClient.length}`);

  // Show the client mappings
  const clientMap = {};
  for (const r of reports) {
    const clientId = r.clientId || r.client_id || null;
    const clientName = r.clientName || r.client_name || 'UNKNOWN';
    const title = r.title || r.reportTitle || 'Untitled';
    if (clientId || clientName !== 'UNKNOWN') {
      if (!clientMap[clientId || clientName]) {
        clientMap[clientId || clientName] = { clientId, clientName, reports: [] };
      }
      clientMap[clientId || clientName].reports.push({
        firebaseId: r.firebaseId,
        title,
        dateRange: r.dateRange || r.date_range || '',
        createdAt: r.createdAt || r.created_at || '',
      });
    }
  }

  console.log(`\n📋 Client-Report Mappings (${Object.keys(clientMap).length} clients):`);
  for (const [key, val] of Object.entries(clientMap)) {
    console.log(`   ${val.clientName} (${val.clientId || 'no-id'}): ${val.reports.length} reports`);
  }

  if (DRY_RUN) {
    console.log('\n🏷️  DRY RUN — would update Supabase instagram_reports with client links');

    // Export the mapping as JSON for review
    const exportData = reports.map(r => ({
      firebaseId: r.firebaseId,
      clientId: r.clientId || r.client_id || null,
      clientName: r.clientName || r.client_name || null,
      title: r.title || r.reportTitle || null,
      userEmail: r.userEmail || r.user_email || null,
      dateRange: r.dateRange || r.date_range || null,
      createdAt: r.createdAt || r.created_at || null,
    }));
    const fs = await import('fs');
    const outPath = 'scripts/firebase-report-mappings.json';
    fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2));
    console.log(`\n📁 Exported ${exportData.length} report mappings to ${outPath}`);
    return;
  }

  // Fetch existing Supabase reports to match
  const { data: supaReports, error: fetchErr } = await supabase
    .from('instagram_reports')
    .select('id, title, client_id_legacy, client_name, user_email, date_range, created_at');

  if (fetchErr) {
    console.error(`❌ Failed to fetch Supabase reports: ${fetchErr.message}`);
    return;
  }

  console.log(`\n📦 Supabase has ${supaReports.length} instagram_reports`);

  // Match Firebase reports to Supabase reports by title + user_email + date_range
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const fbReport of reports) {
    const fbClientId = fbReport.clientId || fbReport.client_id || null;
    const fbClientName = fbReport.clientName || fbReport.client_name || null;

    if (!fbClientId && !fbClientName) {
      skipped++;
      continue; // No client info in Firebase either
    }

    const fbTitle = (fbReport.title || fbReport.reportTitle || '').trim().toLowerCase();
    const fbEmail = (fbReport.userEmail || fbReport.user_email || '').trim().toLowerCase();

    // Find matching Supabase report
    const match = supaReports.find(sr => {
      const srTitle = (sr.title || '').trim().toLowerCase();
      const srEmail = (sr.user_email || '').trim().toLowerCase();

      // Match by title + email (most reliable)
      if (srTitle && fbTitle && srTitle === fbTitle && srEmail === fbEmail) return true;

      // Match by title if unique enough
      if (srTitle && fbTitle && srTitle === fbTitle) return true;

      return false;
    });

    if (match) {
      // Only update if missing client link
      if (!match.client_id_legacy && !match.client_name) {
        const { error: updateErr } = await supabase
          .from('instagram_reports')
          .update({
            client_id_legacy: fbClientId,
            client_name: fbClientName || '',
          })
          .eq('id', match.id);

        if (updateErr) {
          console.error(`   ❌ Failed to update report ${match.id}: ${updateErr.message}`);
        } else {
          updated++;
          console.log(`   ✅ Linked "${match.title}" → ${fbClientName}`);
        }
      } else {
        skipped++;
      }
    } else {
      notFound++;
      if (notFound <= 5) {
        console.log(`   ⚠️  No Supabase match for Firebase report: "${fbTitle}" by ${fbEmail}`);
      }
    }
  }

  if (notFound > 5) console.log(`   ... and ${notFound - 5} more unmatched`);

  console.log(`\n📊 Results:`);
  console.log(`   Updated:   ${updated}`);
  console.log(`   Skipped:   ${skipped} (already linked or no client info)`);
  console.log(`   Not found: ${notFound} (no Supabase match)`);
}

// ── Also check for other collections that might have data ────────────────────
async function listFirebaseCollections() {
  console.log('\n═══════════════════════════════════════════');
  console.log('🔍 FIREBASE COLLECTION SURVEY');
  console.log('═══════════════════════════════════════════');

  const knownCollections = [
    'approved_users', 'pending_users', 'users',
    'crm', 'crm_data',
    'instagram_reports', 'instagramReports', 'reports',
    'clients', 'tasks', 'system_config',
    'leave_requests', 'employees', 'notifications',
    'support_tickets', 'error_reports',
    'content_calendars', 'graphic_projects', 'resources',
    'client_messages', 'client_reports', 'pending_clients',
  ];

  for (const name of knownCollections) {
    try {
      const snap = await getDocs(collection(db, name));
      if (!snap.empty) {
        console.log(`   ✅ ${name}: ${snap.size} documents`);
      }
    } catch (err) {
      // Permission denied or doesn't exist — skip silently
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Firebase → Supabase Data Restore');
  console.log(`   Firebase project: ${firebaseConfig.projectId}`);
  console.log(`   Supabase URL:     ${SUPABASE_URL}`);
  console.log('');

  try {
    // Always do a collection survey first
    await listFirebaseCollections();

    if (DO_CRM) await migrateCRM();
    if (DO_REPORTS) await migrateInstagramReports();

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  }

  process.exit(0);
}

main();
