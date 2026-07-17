/**
 * Client-side entry point for AI calls.
 *
 * All AI now goes through the server-side proxy at /api/ai so the OpenRouter /
 * OpenAI key never ships in the browser bundle. This mirrors the existing
 * `/api/create-approved-user` pattern (called via window.location.origin).
 *
 * NOTE: in local `react-scripts start` (port 3000) the /api routes are not
 * served — run `vercel dev` to exercise AI locally, same as the other /api
 * functions. Production (Vercel) serves them normally.
 */

import { supabase } from '../lib/supabase';

async function getAccessToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Send an OpenAI-compatible chat completion request through the proxy.
 * @param {Object} body - { model, messages, temperature, max_tokens, response_format, ... }
 * @returns {Promise<Object>} Parsed provider response ({ choices: [...] }).
 * @throws {Error} with a human-readable message and a numeric `.status` on failure.
 */
export async function aiChatCompletion(body) {
  const token = await getAccessToken();
  const response = await fetch(`${window.location.origin}/api/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `AI request failed (${response.status})`;
    try {
      const errData = await response.json();
      message = errData?.error?.message || message;
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

/**
 * Convenience wrapper returning just the assistant message content string.
 */
export async function aiChatContent(body) {
  const data = await aiChatCompletion(body);
  return data?.choices?.[0]?.message?.content || '';
}
