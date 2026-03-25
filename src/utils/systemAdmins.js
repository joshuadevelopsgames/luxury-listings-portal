/**
 * System Admins Resolver — Supabase-backed
 * Loads admin emails from Supabase system_config table.
 * Falls back to the bootstrap admin email if the row doesn't exist yet.
 */

import { supabase } from '../lib/supabase';

const BOOTSTRAP_ADMIN = 'jrsschroeder@gmail.com';
const DEMO_VIEW_ONLY_EMAILS = ['demo@luxurylistings.app'];

let _adminEmails = [BOOTSTRAP_ADMIN];
let _loaded = false;
let _listeners = [];

function _notifyListeners() {
  _listeners.forEach(cb => cb(_adminEmails));
}

export async function loadSystemAdmins() {
  try {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'admins')
      .maybeSingle();
    if (data?.value?.emails) {
      _adminEmails = [...new Set([BOOTSTRAP_ADMIN, ...data.value.emails.map(e => e.toLowerCase())])];
    }
  } catch (error) {
    console.warn('Could not load system admins, using bootstrap admin:', error.message);
  }
  _loaded = true;
  _notifyListeners();
  return _adminEmails;
}

export function onSystemAdminsChange(callback) {
  _listeners.push(callback);
  if (_loaded) callback(_adminEmails);
  return () => { _listeners = _listeners.filter(l => l !== callback); };
}

export function startAdminListener() {
  const channel = supabase
    .channel('system-admins-watcher')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, (payload) => {
      if (payload?.new?.key === 'admins') {
        const emails = payload.new.value?.emails || [];
        _adminEmails = [...new Set([BOOTSTRAP_ADMIN, ...emails.map(e => e.toLowerCase())])];
        _loaded = true;
        _notifyListeners();
      }
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function isSystemAdmin(email) {
  if (!email) return false;
  return _adminEmails.includes(email.toLowerCase());
}

export function isDemoViewOnly(email) {
  if (!email) return false;
  return DEMO_VIEW_ONLY_EMAILS.includes(email.toLowerCase());
}

export function getSystemAdmins() {
  return [..._adminEmails];
}

export const BOOTSTRAP_ADMIN_EMAIL = BOOTSTRAP_ADMIN;
