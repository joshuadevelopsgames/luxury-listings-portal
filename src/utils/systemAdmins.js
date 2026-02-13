/**
 * System Admins Resolver
 *
 * Loads admin emails from Firestore system_config/admins doc.
 * Falls back to the bootstrap admin email if the doc doesn't exist yet.
 *
 * BACKWARD COMPATIBILITY: The bootstrap email ensures the original admin
 * always has access, even before the system_config/admins doc is created.
 * Once the doc exists, it becomes the source of truth (bootstrap is still included).
 */

import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Bootstrap admin - always included as fallback so the system is never locked out
const BOOTSTRAP_ADMIN = 'jrsschroeder@gmail.com';

// Demo user - view-only access (not a real admin)
const DEMO_VIEW_ONLY_EMAILS = ['demo@luxurylistings.app'];

// In-memory cache of admin emails (populated on first load)
let _adminEmails = [BOOTSTRAP_ADMIN];
let _loaded = false;
let _listeners = [];

/**
 * Load admin emails from Firestore system_config/admins
 * Returns array of admin email strings
 */
export async function loadSystemAdmins() {
  try {
    const adminDocRef = doc(db, 'system_config', 'admins');
    const adminSnap = await getDoc(adminDocRef);

    if (adminSnap.exists()) {
      const data = adminSnap.data();
      const emails = data.emails || [];
      // Always include bootstrap admin
      const allAdmins = [...new Set([BOOTSTRAP_ADMIN, ...emails.map(e => e.toLowerCase())])];
      _adminEmails = allAdmins;
      _loaded = true;
      _notifyListeners();
      return allAdmins;
    }
  } catch (error) {
    console.warn('Could not load system admins from Firestore, using bootstrap admin:', error.message);
  }

  _loaded = true;
  return _adminEmails;
}

/**
 * Subscribe to real-time admin changes
 */
export function onSystemAdminsChange(callback) {
  _listeners.push(callback);

  // If already loaded, call immediately
  if (_loaded) {
    callback(_adminEmails);
  }

  return () => {
    _listeners = _listeners.filter(l => l !== callback);
  };
}

function _notifyListeners() {
  _listeners.forEach(cb => cb(_adminEmails));
}

/**
 * Start real-time listener for admin changes
 */
export function startAdminListener() {
  try {
    const adminDocRef = doc(db, 'system_config', 'admins');
    return onSnapshot(adminDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const emails = data.emails || [];
        _adminEmails = [...new Set([BOOTSTRAP_ADMIN, ...emails.map(e => e.toLowerCase())])];
      } else {
        _adminEmails = [BOOTSTRAP_ADMIN];
      }
      _loaded = true;
      _notifyListeners();
    }, (error) => {
      console.warn('Admin listener error:', error.message);
    });
  } catch (error) {
    console.warn('Could not start admin listener:', error.message);
    return () => {};
  }
}

/**
 * Check if an email is a system admin
 */
export function isSystemAdmin(email) {
  if (!email) return false;
  return _adminEmails.includes(email.toLowerCase());
}

/**
 * Check if an email is a demo view-only user
 */
export function isDemoViewOnly(email) {
  if (!email) return false;
  return DEMO_VIEW_ONLY_EMAILS.includes(email.toLowerCase());
}

/**
 * Get current admin emails (sync, from cache)
 */
export function getSystemAdmins() {
  return [..._adminEmails];
}

/**
 * Bootstrap admin email (for Firestore rules fallback)
 */
export const BOOTSTRAP_ADMIN_EMAIL = BOOTSTRAP_ADMIN;
