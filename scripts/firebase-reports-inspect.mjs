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

// Pull one Firebase report and one Supabase report and compare structure
const fbSnap = await db.collection('instagram_reports').limit(3).get();
const fbDocs = fbSnap.docs.map(d => ({ id: d.id, ...d.data() }));

const { data: sbDocs } = await sb.from('instagram_reports').select('*').limit(3);

console.log('=== FIREBASE REPORT KEYS ===');
console.log(Object.keys(fbDocs[0]).join('\n'));
console.log('\n=== SUPABASE REPORT KEYS ===');
console.log(Object.keys(sbDocs[0]).join('\n'));

// Check what the 'reportData' or equivalent field looks like in Firebase
const fbSample = fbDocs[0];
console.log('\n=== FIREBASE SAMPLE (full) ===');
// Find the big data field
const bigFields = Object.entries(fbSample).filter(([k, v]) => typeof v === 'object' && v !== null && !Array.isArray(v) && k !== 'id');
bigFields.forEach(([k, v]) => {
  console.log(`\nField: ${k} (keys: ${Object.keys(v).slice(0,10).join(', ')})`);
});

const sbSample = sbDocs[0];
console.log('\n=== SUPABASE SAMPLE (full) ===');
const sbBigFields = Object.entries(sbSample).filter(([k, v]) => typeof v === 'object' && v !== null && !Array.isArray(v) && k !== null);
sbBigFields.forEach(([k, v]) => {
  if (v) console.log(`\nField: ${k} (keys: ${Object.keys(v).slice(0,10).join(', ')})`);
});

// Check specifically what 'report_data' looks like in supabase
console.log('\n=== SUPABASE report_data sample ===');
console.log(JSON.stringify(sbSample.report_data, null, 2).substring(0, 1000));

console.log('\n=== FIREBASE report data sample ===');
// Find equivalent field
const fbDataField = fbSample.reportData || fbSample.report_data || fbSample.data || fbSample.metrics;
console.log('Field name found:', fbSample.reportData ? 'reportData' : fbSample.report_data ? 'report_data' : fbSample.data ? 'data' : fbSample.metrics ? 'metrics' : 'NONE');
console.log(JSON.stringify(fbDataField, null, 2)?.substring(0, 1000));

process.exit(0);
