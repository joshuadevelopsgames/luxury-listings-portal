/**
 * Edge Function Service
 *
 * Calls Supabase Edge Functions with an explicit Authorization header.
 *
 * Root cause of 401 errors: the custom lock bypass in src/lib/supabase.js
 *   lock: (name, acquireTimeout, fn) => fn()
 * causes supabase.auth.getSession() to occasionally return null even when
 * the user IS signed in — the lock-free execution means the session isn't
 * guaranteed to be loaded from localStorage before the first getSession() call.
 *
 * Fix: subscribe to onAuthStateChange at module load time and keep a
 * module-level token cache. This token is always fresh because Supabase
 * fires onAuthStateChange on every session change (sign-in, refresh, etc.).
 * getSession() is used as a secondary fallback for the initial call.
 */

import { supabase } from '../lib/supabase';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// ─── Module-level token cache ───────────────────────────────────────────────
// Populated immediately from any existing session, then kept up-to-date
// via onAuthStateChange.
let _cachedToken = null;

// Seed from existing session on module load (best-effort, async)
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.access_token && !_cachedToken) {
    _cachedToken = session.access_token;
  }
});

// Keep token fresh on every auth event (sign-in, token refresh, sign-out)
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token || null;
});
// ────────────────────────────────────────────────────────────────────────────

/**
 * Invoke a Supabase Edge Function.
 * @param {string} fnName - Edge function name (e.g. 'extract-instagram-metrics')
 * @param {object} body - JSON body to send
 * @param {number} timeoutMs - Timeout in milliseconds (default 60s)
 * @returns {Promise<any>} - Parsed JSON response data
 */
export async function invokeEdgeFunction(fnName, body = {}, timeoutMs = 60000) {
  // 1. Use the cached token if available (most reliable path)
  // 2. Fall back to a fresh getSession() call
  let accessToken = _cachedToken;
  if (!accessToken) {
    const { data: sessionData } = await supabase.auth.getSession();
    accessToken = sessionData?.session?.access_token || null;
    if (accessToken) _cachedToken = accessToken; // warm the cache
  }

  if (!accessToken) {
    throw new Error('Not authenticated — please sign in and try again.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
  };

  const url = `${SUPABASE_URL}/functions/v1/${fnName}`;

  const fetchPromise = fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }).then(async (response) => {
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Edge function ${fnName} returned non-JSON (status ${response.status})`);
    }
    if (!response.ok || data?.error) {
      const msg = data?.error || `Edge function ${fnName} failed (${response.status})`;
      console.error(`[EdgeFunction] ${fnName} error:`, msg);
      throw new Error(msg);
    }
    return data;
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Edge function ${fnName} timed out after ${timeoutMs / 1000}s`)),
      timeoutMs
    )
  );

  return Promise.race([fetchPromise, timeoutPromise]);
}
