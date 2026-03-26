/**
 * Edge Function Service
 *
 * Calls Supabase Edge Functions by explicitly retrieving the user's JWT
 * from the session and passing it as an Authorization header via fetch.
 * This is more reliable than supabase.functions.invoke() which depends on
 * the client's internal session state (which can be stale after page reload).
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
  // Explicitly get the session token — more reliable than relying on
  // supabase.functions.invoke()'s internal session state after page reload.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated — no active session found');
  }

  const url = `${SUPABASE_URL}/functions/v1/${fnName}`;

  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok || data.error) {
      const err = new Error(data.error || `Edge function ${fnName} failed (${response.status})`);
      console.error(`[EdgeFunction] ${fnName} error:`, err.message);
      throw err;
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
