#!/usr/bin/env node
/**
 * One-time: set isApproved: true (and approvedAt if missing) for every doc in approved_users.
 * Ensures everyone on the Users & Permissions page can log in.
 * Run: node scripts/ensure-all-approved-users-approved.js
 * Uses GOOGLE_APPLICATION_CREDENTIALS or gcloud default credentials.
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'luxury-listings-portal-e56de' });
const db = admin.firestore();
const col = db.collection('approved_users');

async function main() {
  const snap = await col.get();
  const now = admin.firestore.FieldValue.serverTimestamp();
  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.isApproved === true && data.approvedAt) {
      continue;
    }
    const updates = { isApproved: true, updatedAt: now };
    if (!data.approvedAt) updates.approvedAt = now;
    await doc.ref.update(updates);
    updated++;
    console.log('Approved:', doc.id);
  }
  console.log('Done. Updated', updated, 'of', snap.size, 'users.');
}

main().catch((e) => { console.error(e); process.exit(1); });
