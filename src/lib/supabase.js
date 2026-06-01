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

// ── Bypass the hanging getSession() for PostgREST/Storage/Realtime requests ──
//
// supabase-js resolves the bearer token via _getAccessToken() before every
// PostgREST/Storage/Realtime request. With no `accessToken` option that calls
// auth.getSession(), which HANGS once the auth lock bypass (above) lets
// concurrent autoRefreshToken refreshes corrupt the internal refresh promise.
// Symptom: requests early in a session succeed, then a later write hangs
// forever — no resolve, no reject (the button just spins).
//
// _getAccessToken short-circuits on the instance `accessToken` fn before it
// ever reaches getSession:
//     async _getAccessToken() {
//       if (this.accessToken) return await this.accessToken();  // ← our path
//       const { data } = await this.auth.getSession();          // ← the hang
//     }
// We set `accessToken` AFTER createClient (not as a constructor option) so the
// normal auth client is still built — passing it to createClient would replace
// supabase.auth with a Proxy that throws on every access, breaking login.
//
// NOTE: reassigning supabase._getAccessToken directly does NOTHING here — the
// REST/Storage/Realtime clients capture `this._getAccessToken.bind(this)` at
// construction, so a later override of that method is never invoked. Setting
// `accessToken` works because the original (already-bound) _getAccessToken
// reads `this.accessToken` lazily on each call. If null, fetchWithAuth falls
// back to the anon key, so unauthenticated reads still work.
supabase.accessToken = async () => {
  try {
    const raw = localStorage.getItem(SB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.access_token || null;
    }
  } catch { /* fall through to anon key */ }
  return null;
};
console.log('[Supabase] Routing request auth through localStorage token (accessToken shim)');
