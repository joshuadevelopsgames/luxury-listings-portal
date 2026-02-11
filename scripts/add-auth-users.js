#!/usr/bin/env node
/**
 * Create users in Firebase Authentication (email/password) and add to approved_users.
 * Run: node scripts/add-auth-users.js email1@domain.com email2@domain.com
 * Example: node scripts/add-auth-users.js luca@luxury-listings.com tara@luxury-listings.com
 * Uses GOOGLE_APPLICATION_CREDENTIALS or gcloud default credentials.
 * Prints a temporary password per user; they can sign in with email/password then reset.
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

const emails = process.argv.slice(2).map(e => e.trim()).filter(Boolean);
if (emails.length === 0) {
  console.error('Usage: node scripts/add-auth-users.js <email1> [email2 ...]');
  process.exit(1);
}

const BASE_MODULE_IDS = ['time-off', 'my-clients', 'instagram-reports'];
const DEFAULT_PAGES = ['dashboard', 'tasks', 'resources', 'features', ...BASE_MODULE_IDS];

function randomPassword() {
  return crypto.randomBytes(8).toString('base64').replace(/[+/=]/g, (c) => ({ '+': 'x', '/': 'y', '=': '' }[c] || ''));
}

admin.initializeApp({ projectId: 'luxury-listings-portal-e56de' });
const db = admin.firestore();
const auth = admin.auth();

async function addOne(email) {
  const normalized = email.trim().toLowerCase();
  const password = randomPassword();

  try {
    await auth.createUser({
      email: normalized,
      password,
      emailVerified: false,
      displayName: normalized.split('@')[0]
    });
    console.log('Auth created:', normalized, '| temp password:', password);
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      console.log('Auth already exists:', normalized);
    } else {
      throw e;
    }
  }

  const ref = db.collection('approved_users').doc(normalized);
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
    console.log('Approved_users updated:', normalized);
  } else {
    await ref.set(base);
    console.log('Approved_users created:', normalized);
  }

  return password;
}

async function main() {
  const results = [];
  for (const e of emails) {
    const pwd = await addOne(e);
    results.push({ email: e.trim().toLowerCase(), password: pwd });
  }
  console.log('\n--- Temp passwords (have them change via Forgot password) ---');
  results.forEach(({ email, password }) => console.log(email, '→', password));
}

main().catch((e) => { console.error(e); process.exit(1); });
