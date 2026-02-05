#!/usr/bin/env node
/**
 * One-off: set every client with packageSize 10 (or missing default) to packageSize 12.
 * Run: node scripts/update-package-size-10-to-12.js
 * Requires: GOOGLE_APPLICATION_CREDENTIALS pointing to a service account key, or run
 *   gcloud auth application-default login
 * before running.
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'luxury-listings-portal-e56de' });
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('clients').get();
  const toUpdate = [];
  snapshot.forEach((doc) => {
    const d = doc.data();
    const packageSize = d.packageSize;
    const postsRemaining = d.postsRemaining;
    const isDefaultTen = packageSize === 10 || packageSize === undefined || packageSize === null;
    if (!isDefaultTen) return;
    const updates = { packageSize: 12 };
    if (postsRemaining === 10) updates.postsRemaining = 12;
    toUpdate.push({ id: doc.id, ...d, updates });
  });

  console.log(`Found ${toUpdate.length} clients with packageSize 10 or missing (will set to 12).`);
  if (toUpdate.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
    return;
  }

  for (const { id, clientName, updates: u } of toUpdate) {
    await db.collection('clients').doc(id).update({
      ...u,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Updated: ${clientName || id} → packageSize 12`);
  }
  console.log(`Done. Updated ${toUpdate.length} clients.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
