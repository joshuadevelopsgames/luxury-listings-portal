#!/usr/bin/env node
/**
 * Add users to approved_users so they can log in (unblock "pending" users).
 * Run: node scripts/approve-users.js email1@domain.com email2@domain.com
 * Example: node scripts/approve-users.js luca@luxury-listings.com tara@luxury-listings.com
 * Uses GOOGLE_APPLICATION_CREDENTIALS or gcloud default credentials.
 */

const admin = require('firebase-admin');

const emails = process.argv.slice(2).map(e => e.trim()).filter(Boolean);
if (emails.length === 0) {
  console.error('Usage: node scripts/approve-users.js <email1> [email2 ...]');
  process.exit(1);
}

// Default pages for new users (base modules + common; match PermissionsManager DEFAULT_PAGES)
const BASE_MODULE_IDS = ['time-off', 'my-clients', 'instagram-reports'];
const DEFAULT_PAGES = ['dashboard', 'tasks', 'resources', 'features', 'tutorials', ...BASE_MODULE_IDS];

admin.initializeApp({ projectId: 'luxury-listings-portal-e56de' });
const db = admin.firestore();

async function approve(email) {
  const col = db.collection('approved_users');
  const normalized = email.trim().toLowerCase();
  const docId = normalized;
  const ref = col.doc(docId);
  const snap = await ref.get();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const base = {
    email: normalized,
    isApproved: true,
    approvedAt: now,
    updatedAt: now,
    role: 'content_director',
    primaryRole: 'content_director',
    pagePermissions: DEFAULT_PAGES
  };
  if (snap.exists) {
    const data = snap.data();
    const updates = { isApproved: true, updatedAt: now };
    if (!data.pagePermissions || data.pagePermissions.length === 0) updates.pagePermissions = DEFAULT_PAGES;
    await ref.update(updates);
    console.log('Updated (approved):', docId);
  } else {
    await ref.set(base);
    console.log('Created (approved):', docId);
  }
}

async function main() {
  for (const e of emails) {
    await approve(e);
  }
  console.log('Done. Users can log in now.');
}

main().catch((e) => { console.error(e); process.exit(1); });
