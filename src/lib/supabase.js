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

// ── Custom fetch: inject JWT from localStorage for non-auth requests ─────────
// The Supabase JS client internally calls getSession() before every PostgREST
// request to attach the JWT. getSession() can hang for 10+ seconds when the
// internal session refresh promise is pending (even with the lock bypass).
//
// This custom fetch reads the access_token directly from localStorage and
// injects it as the Authorization header for PostgREST/storage/realtime calls,
// completely bypassing the hanging getSession() path.
const nativeFetch = window.fetch.bind(window);

function supabaseFetch(input, init) {
  const url = typeof input === 'string' ? input : input?.url || '';

  // Only inject token for non-auth API calls (PostgREST, Storage, Realtime, Functions)
  if (!url.includes('/auth/')) {
    try {
      const raw = localStorage.getItem(SB_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.access_token;
        if (token) {
          const headers = new Headers(init?.headers || {});
          headers.set('Authorization', `Bearer ${token}`);
          init = { ...init, headers };
        }
      }
    } catch { /* fall through — use whatever header the client set */ }
  }

  return nativeFetch(input, init);
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: (name, acquireTimeout, fn) => fn(),
  },
  global: {
    fetch: supabaseFetch,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
