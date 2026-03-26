/**
 * Edge Function Service
 *
 * Calls Supabase Edge Functions by explicitly retrieving the user's JWT
 * from the session and passing it as an Authorization header via fetch.
 * This is more reliable than supabase.functions.invoke() which depends on
 * the client's internal session state (which can be stale after page reload
 * or when the custom navigator-lock bypass in src/lib/supabase.js is active).
 */

import { supabase } from '../lib/supabase';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

/**
 * Invoke a Supabase Edge Function.
 * @param {string} fnName - Edge function name (e.g. 'extract-instagram-metrics')
 * @param {object} body - JSON body to send
 * @param {number} timeoutMs - Timeout in milliseconds (default 60s)
 * @returns {Promise<any>} - Parsed JSON response data
 */
export async function invokeEdgeFunction(fnName, body = {}, timeoutMs = 60000) {
  // Explicitly get the session so we can attach the JWT ourselves.
  // supabase.functions.invoke() should do this automatically, but the
  // custom lock: (name, timeout, fn) => fn() in src/lib/supabase.js can
  // cause it to miss the token if called before the session is resolved.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

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
