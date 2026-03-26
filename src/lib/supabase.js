import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Missing Supabase environment variables.\n' +
    'Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your .env file.'
  );
}

// ── Storage key for the auth token ───────────────────────────────────────────
const SB_STORAGE_KEY = supabaseUrl
  ? `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
  : '';

// ── Auto-heal corrupted auth tokens ──────────────────────────────────────────
try {
  const raw = localStorage.getItem(SB_STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    const accessToken = parsed?.access_token || parsed?.currentSession?.access_token;
    if (accessToken) {
      const parts = accessToken.split('.');
      if (parts.length !== 3) throw new Error('malformed JWT');
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && (payload.exp * 1000) < Date.now() - 86400000) {
        throw new Error('JWT expired > 24h ago');
      }
    }
  }
} catch (err) {
  console.warn('[Supabase] Clearing corrupted auth tokens:', err.message);
  Object.keys(localStorage)
    .filter((k) => k.startsWith('sb-'))
    .forEach((k) => localStorage.removeItem(k));
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: (name, acquireTimeout, fn) => fn(),
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ── Override _getAccessToken to bypass the hanging getSession() ──────────────
//
// The Supabase JS client calls getSession() internally before EVERY PostgREST,
// Storage, and Realtime request. getSession() hangs because the internal
// _refreshSessionPromise gets corrupted when the lock bypass allows concurrent
// token refreshes.
//
// The custom fetch approach doesn't work because the hang occurs BEFORE
// fetch() is called (in the client's _getAccessToken → getSession chain).
//
// Fix: override _getAccessToken to read the JWT directly from localStorage.
// Auth module still works normally (login/logout/onAuthStateChange/refresh) —
// this only affects how PostgREST/Storage/Functions get their bearer token.
if (typeof supabase._getAccessToken === 'function') {
  supabase._getAccessToken = async () => {
    try {
      const raw = localStorage.getItem(SB_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.access_token || null;
      }
    } catch { /* fall through */ }
    return null;
  };
  console.log('[Supabase] Patched _getAccessToken to read from localStorage');
}
