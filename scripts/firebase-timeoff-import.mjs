/**
 * Import Firestore `leave_requests` → Supabase `time_off_requests`.
 *
 * Env:
 *   GOOGLE_APPLICATION_CREDENTIALS — path to Firebase service account JSON (or FIREBASE_SERVICE_ACCOUNT_PATH)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 *   Optional: FIRESTORE_LEAVE_COLLECTION (default leave_requests)
 */
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!credPath || !supabaseUrl || !supabaseKey) {
  console.error('Missing env: GOOGLE_APPLICATION_CREDENTIALS (or FIREBASE_SERVICE_ACCOUNT_PATH), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const sb = createClient(supabaseUrl, supabaseKey);

const collectionName = process.env.FIRESTORE_LEAVE_COLLECTION || 'leave_requests';

const toDate = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v.length > 10 ? v.substring(0, 10) : v;
  if (v._seconds) return new Date(v._seconds * 1000).toISOString().substring(0, 10);
  if (v.toDate) return v.toDate().toISOString().substring(0, 10);
  return String(v).substring(0, 10);
};
const toISO = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v._seconds) return new Date(v._seconds * 1000).toISOString();
  if (v.toDate) return v.toDate().toISOString();
  return null;
};

function inclusiveCalendarDays(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

const snap = await db.collection(collectionName).get();
const docs = snap.docs.map(d => ({ firebaseId: d.id, ...d.data() }));
console.log(`Found ${docs.length} leave requests in Firebase (${collectionName})`);

const emails = [...new Set(docs.map(d => d.employeeEmail || d.userEmail || d.user_email || d.email).filter(Boolean))];
const { data: profiles } = await sb.from('profiles').select('id, email, full_name, first_name, last_name').in('email', emails);
const emailToId = {};
const emailToName = {};
(profiles || []).forEach(p => {
  emailToId[p.email] = p.id;
  const n = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ');
  if (n) emailToName[p.email.toLowerCase()] = n;
});
console.log(`Resolved ${Object.keys(emailToId).length}/${emails.length} profile IDs`);

const rows = docs.map(doc => {
  const userEmail = doc.employeeEmail || doc.userEmail || doc.user_email || doc.email || null;
  const start = toDate(doc.startDate || doc.start_date);
  const end = toDate(doc.endDate || doc.end_date);
  let days = doc.daysRequested ?? doc.days_requested ?? doc.days ?? null;
  if (days == null) days = inclusiveCalendarDays(start, end);

  const fromFirebase =
    doc.employeeName ||
    doc.userName ||
    doc.displayName ||
    doc.name ||
    null;
  const fromProfile = userEmail ? emailToName[userEmail.toLowerCase()] : null;
  const employeeName = fromFirebase || fromProfile || (userEmail ? userEmail.split('@')[0] : null);

  return {
    user_id: userEmail ? emailToId[userEmail] || null : null,
    user_email: userEmail,
    employee_name: employeeName,
    leave_type: doc.leaveType || doc.leave_type || doc.type || null,
    type: doc.leaveType || doc.leave_type || doc.type || null,
    start_date: start,
    end_date: end,
    days_requested: days,
    status: doc.status || 'approved',
    reason: doc.reason || doc.notes || null,
    reviewed_by_email: doc.reviewedBy || doc.reviewed_by || doc.approvedBy || null,
    reviewed_at: toISO(doc.reviewedDate || doc.reviewedAt || doc.reviewed_at || doc.approvedAt),
    history: doc.history || null,
    created_at: toISO(doc.createdAt || doc.submittedDate || doc.created_at) || new Date().toISOString(),
    updated_at: toISO(doc.updatedAt || doc.updated_at) || new Date().toISOString(),
  };
});

console.log('\nRecords to import:');
rows.forEach(r => console.log(`  ${r.user_email} | ${r.employee_name} | ${r.leave_type} | ${r.start_date} → ${r.end_date} | ${r.days_requested}d | ${r.status}`));

const { data, error } = await sb.from('time_off_requests').insert(rows).select();
if (error) {
  console.error('\n❌ Insert error:', error.message);
  console.error('Detail:', error.details || error.hint || '');
  process.exit(1);
}

console.log(`\n✅ Successfully imported ${data.length} time off requests!`);
data.forEach(r => console.log(`  [${r.id}] ${r.user_email} | ${r.employee_name || ''} | ${r.start_date} → ${r.end_date}`));

process.exit(0);
