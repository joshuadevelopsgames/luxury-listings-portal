import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Missing Supabase environment variables.\n' +
    'Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your .env file.'
  );
}

// ── Auto-heal corrupted auth tokens ──────────────────────────────────────────
// If the stored session's access_token can't be decoded or is missing required
// fields, nuke it so createClient starts fresh instead of hanging forever
// trying to refresh a poisoned token.
try {
  const storageKey = `sb-${new URL(supabaseUrl || '').hostname.split('.')[0]}-auth-token`;
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    const parsed = JSON.parse(raw);
    const accessToken = parsed?.access_token || parsed?.currentSession?.access_token;
    if (accessToken) {
      // JWT has 3 parts separated by dots — quick sanity check
      const parts = accessToken.split('.');
      if (parts.length !== 3) throw new Error('malformed JWT');
      const payload = JSON.parse(atob(parts[1]));
      // If the token expired more than 24 hours ago, it's stale beyond
      // what a normal refresh can recover — clear it.
      if (payload.exp && (payload.exp * 1000) < Date.now() - 86400000) {
        throw new Error('JWT expired > 24h ago');
      }
    }
  }
} catch (err) {
  console.warn('[Supabase] Clearing corrupted auth tokens:', err.message);
  // Remove all sb-* keys for this project
  Object.keys(localStorage)
    .filter((k) => k.startsWith('sb-'))
    .forEach((k) => localStorage.removeItem(k));
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Bypass the Navigator LockManager API. The default navigatorLock
    // implementation can get permanently stuck after page reloads (the
    // AbortController times out after ~10s, blocking ALL auth operations
    // including getSession/setSession/onAuthStateChange). Since this app
    // doesn't need cross-tab session coordination, a no-op lock that just
    // runs the callback immediately is safe and eliminates the issue.
    lock: (name, acquireTimeout, fn) => fn(),
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
