import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('/sessions/brave-gracious-noether/mnt/uploads/ec93b0a0-a166-4060-8f0a-b23adc65edad-1774456889582_luxury-listings-portal-e56de-firebase-adminsdk-fbsvc-3dd2b9fd56.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const sb = createClient(
  'https://qbhimpuzhvgltgplpoji.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaGltcHV6aHZnbHRncGxwb2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAzNDQzNywiZXhwIjoyMDg5NjEwNDM3fQ.J_ig4hkor-dVq_cQ87H9LCKG39iT3ihOtEd8yCRp8bw'
);

// Pull all Firebase reports
const fbSnap = await db.collection('instagram_reports').get();
const fbDocs = fbSnap.docs.map(d => ({ id: d.id, ...d.data() }));
console.log(`Firebase: ${fbDocs.length} reports`);

// Pull all Supabase reports
const { data: sbDocs } = await sb.from('instagram_reports').select('id, client_id, client_id_legacy, user_id_legacy, created_by_id, user_email, title, year, month, metrics, raw_ocr_data, screenshots').eq('archived', false);
console.log(`Supabase: ${sbDocs.length} reports`);

// Print a Firebase metrics sample to understand full structure
console.log('\n=== FIREBASE metrics sample ===');
console.log(JSON.stringify(fbDocs[0].metrics, null, 2).substring(0, 2000));
console.log('\n=== FIREBASE screenshots sample ===');
console.log(JSON.stringify(fbDocs[0].screenshots, null, 2)?.substring(0, 500));
console.log('\n=== FIREBASE postLinks sample ===');
console.log(JSON.stringify(fbDocs[0].postLinks, null, 2)?.substring(0, 500));

// Check Supabase metrics for same fields
const sbWithEmptyMetrics = sbDocs.filter(r => !r.metrics || Object.keys(r.metrics).length === 0);
const sbWithData = sbDocs.filter(r => r.metrics && Object.keys(r.metrics).length > 0);
console.log(`\nSupabase reports with empty metrics: ${sbWithEmptyMetrics.length}`);
console.log(`Supabase reports with metric data: ${sbWithData.length}`);

// Check the screenshot_urls column
const { data: sbFull } = await sb.from('instagram_reports').select('id, screenshot_urls, screenshots, metrics, raw_ocr_data').limit(2);
console.log('\n=== SUPABASE full sample ===');
sbFull.forEach(r => {
  console.log(`\nReport ${r.id}:`);
  console.log('  screenshot_urls:', JSON.stringify(r.screenshot_urls)?.substring(0, 200));
  console.log('  screenshots:', JSON.stringify(r.screenshots)?.substring(0, 200));
  console.log('  metrics keys:', r.metrics ? Object.keys(r.metrics).join(', ') : 'null');
  console.log('  raw_ocr_data keys:', r.raw_ocr_data ? Object.keys(r.raw_ocr_data).join(', ') : 'null');
});

process.exit(0);
