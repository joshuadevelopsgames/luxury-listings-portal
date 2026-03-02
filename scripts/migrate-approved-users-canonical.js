#!/usr/bin/env node
/**
 * One-time: migrate approved_users docs to canonical (lowercase) doc IDs
 * so lookup by currentUser.email (lowercase) always finds the doc.
 * Run: node scripts/migrate-approved-users-canonical.js
 * Uses GOOGLE_APPLICATION_CREDENTIALS or gcloud default credentials.
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'luxury-listings-portal-e56de' });
const db = admin.firestore();
const col = db.collection('approved_users');

function canonicalKey(emailOrId) {
  return (emailOrId || '').toString().trim().toLowerCase();
}

async function main() {
  const snap = await col.get();
  let migrated = 0;
  let skipped = 0;
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const docSnap of snap.docs) {
    const docId = docSnap.id;
    const canonical = canonicalKey(docId);
    if (!canonical || canonical === docId) {
      skipped++;
      continue;
    }

    const data = docSnap.data();
    const targetRef = col.doc(canonical);
    const targetSnap = await targetRef.get();

    const merged = {
      ...data,
      email: canonical,
      permissionsMigratedAt: now
    };

    if (targetSnap.exists) {
      const existing = targetSnap.data();
      if ((existing.pagePermissions?.length ?? 0) < (data.pagePermissions?.length ?? 0)) {
        merged.pagePermissions = data.pagePermissions ?? existing.pagePermissions ?? [];
      }
      if ((existing.featurePermissions?.length ?? 0) < (data.featurePermissions?.length ?? 0)) {
        merged.featurePermissions = data.featurePermissions ?? existing.featurePermissions ?? [];
      }
    }

    await targetRef.set(merged, { merge: true });
    await docSnap.ref.delete();
    migrated++;
    console.log('Migrated:', docId, '->', canonical);
  }

  console.log('Done. Migrated', migrated, '| Already canonical (skipped)', skipped, '| Total', snap.size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
