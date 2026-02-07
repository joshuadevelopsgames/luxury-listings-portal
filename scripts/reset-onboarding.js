#!/usr/bin/env node
/**
 * Reset a user's onboarding status in Firestore (approved_users) so they see onboarding again.
 * Run: node scripts/reset-onboarding.js [email]
 * Default email: joshua@luxury-listings.com
 * Uses GOOGLE_APPLICATION_CREDENTIALS or gcloud default credentials.
 */

const admin = require('firebase-admin');

const email = process.argv[2] || 'joshua@luxury-listings.com';

admin.initializeApp({ projectId: 'luxury-listings-portal-e56de' });
const db = admin.firestore();

async function main() {
  const col = db.collection('approved_users');
  const trimmed = email.trim();
  const lower = trimmed.toLowerCase();
  let ref = col.doc(trimmed);
  let snap = await ref.get();
  if (!snap.exists && lower !== trimmed) {
    ref = col.doc(lower);
    snap = await ref.get();
  }
  if (!snap.exists) {
    console.error('No approved_users doc found for:', email);
    process.exit(1);
  }
  await ref.update({
    onboardingCompleted: false,
    onboardingCompletedDate: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('Reset onboarding for', ref.id);
  console.log('Done. User will see onboarding on next load.');
}

main().catch((e) => { console.error(e); process.exit(1); });
