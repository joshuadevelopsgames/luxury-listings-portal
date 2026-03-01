#!/usr/bin/env node
/**
 * Set Firebase Auth password for a user by email.
 * Run: node scripts/set-user-password.js <email> <newPassword>
 */

const admin = require('firebase-admin');
const [email, password] = process.argv.slice(2).map((s) => s.trim()).filter(Boolean);
if (!email || !password) {
  console.error('Usage: node scripts/set-user-password.js <email> <newPassword>');
  process.exit(1);
}

admin.initializeApp({ projectId: 'luxury-listings-portal-e56de' });
const auth = admin.auth();

async function main() {
  const user = await auth.getUserByEmail(email.toLowerCase());
  await auth.updateUser(user.uid, { password });
  console.log('Password updated for', email);
}

main().catch((e) => { console.error(e); process.exit(1); });
