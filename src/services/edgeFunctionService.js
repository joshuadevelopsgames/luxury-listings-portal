/**
 * Edge Function Service
 *
 * Thin wrapper around supabase.functions.invoke() that forwards the
 * user's JWT automatically. Replaces all Firebase httpsCallable() usage.
 */

import { supabase } from '../lib/supabase';

/**
 * Invoke a Supabase Edge Function.
 * @param {string} fnName - Edge function name (e.g. 'generate-caption')
 * @param {object} body - JSON body to send
 * @returns {Promise<any>} - Parsed JSON response data
 */
export async function invokeEdgeFunction(fnName, body = {}, timeoutMs = 60000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Edge function ${fnName} timed out after ${timeoutMs / 1000}s`)), timeoutMs)
  );
  const invokePromise = supabase.functions.invoke(fnName, { body });
  const { data, error } = await Promise.race([invokePromise, timeoutPromise]);
  if (error) {
    console.error(`[EdgeFunction] ${fnName} error:`, error);
    throw new Error(error.message || `Edge function ${fnName} failed`);
  }
  return data;
}
