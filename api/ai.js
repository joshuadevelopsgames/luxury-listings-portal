/**
 * Server-side AI proxy for the Luxury Listings Portal.
 *
 * WHY THIS EXISTS: AI calls used to run in the browser with
 * REACT_APP_OPENROUTER_API_KEY, which meant the key was compiled into the
 * public JS bundle and extractable by anyone. This function keeps the key
 * server-side. The client posts an OpenAI-compatible chat body to /api/ai and
 * we forward it to OpenRouter (preferred) or OpenAI with the secret attached.
 *
 * ROLLOUT SAFETY: it reads the *existing* REACT_APP_OPENROUTER_API_KEY as a
 * fallback (serverless functions receive every configured env var regardless of
 * prefix), so AI keeps working the moment this deploys — before any new env var
 * is added. Hardening steps (do after verifying the proxy works):
 *   1. Add server-side OPENROUTER_API_KEY (a freshly rotated key) in Vercel.
 *   2. Delete REACT_APP_OPENROUTER_API_KEY / REACT_APP_OPENAI_API_KEY from Vercel.
 *      The client no longer references them, so the bundle stays clean.
 *   3. Optionally set AI_PROXY_REQUIRE_AUTH=true to require a logged-in session.
 */

export const config = {
  // Vision extraction can take 15–40s; the default 10s would time out.
  maxDuration: 60,
};

// Logical model names the client is allowed to request. Keeps a stolen endpoint
// from being used to call arbitrary/expensive models on your account.
const ALLOWED_MODELS = new Set(['gpt-4o', 'gpt-4o-mini']);
const MAX_TOKENS_CEILING = 4000;

function resolveKey() {
  const openRouter =
    process.env.OPENROUTER_API_KEY || process.env.REACT_APP_OPENROUTER_API_KEY;
  if (openRouter) {
    return {
      key: openRouter,
      url: 'https://openrouter.ai/api/v1/chat/completions',
      isOpenRouter: true,
    };
  }
  const openai = process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;
  if (openai) {
    return {
      key: openai,
      url: 'https://api.openai.com/v1/chat/completions',
      isOpenRouter: false,
    };
  }
  return null;
}

function normalizeModel(requested, isOpenRouter) {
  let base = String(requested || 'gpt-4o-mini').replace(/^openai\//, '');
  if (!ALLOWED_MODELS.has(base)) base = 'gpt-4o-mini';
  return isOpenRouter ? `openai/${base}` : base;
}

// Read the raw body ourselves so the platform's default body parser (1 MB) does
// not reject vision payloads. Only Vercel's hard ~4.5 MB request cap applies;
// the client downsizes screenshots to stay under it.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// Optional: only enforced when AI_PROXY_REQUIRE_AUTH === 'true'. Verifies the
// caller's Supabase access token so the endpoint can't be used anonymously.
async function isAuthorized(req) {
  if (process.env.AI_PROXY_REQUIRE_AUTH !== 'true') return true;

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return false;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;

  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } });
    return;
  }

  const provider = resolveKey();
  if (!provider) {
    res.status(500).json({
      error: {
        message:
          'AI is not configured on the server. Set OPENROUTER_API_KEY (or OPENAI_API_KEY) in the deployment environment.',
      },
    });
    return;
  }

  let body;
  try {
    body = await readRawBody(req);
  } catch (e) {
    res.status(400).json({ error: { message: e.message || 'Invalid request body' } });
    return;
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).json({ error: { message: 'messages array is required' } });
    return;
  }

  if (!(await isAuthorized(req))) {
    res.status(401).json({ error: { message: 'Unauthorized' } });
    return;
  }

  const payload = {
    model: normalizeModel(body.model, provider.isOpenRouter),
    messages: body.messages,
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    max_tokens: Math.min(
      typeof body.max_tokens === 'number' ? body.max_tokens : 1000,
      MAX_TOKENS_CEILING
    ),
  };
  if (body.response_format) payload.response_format = body.response_format;
  if (typeof body.top_p === 'number') payload.top_p = body.top_p;
  if (typeof body.frequency_penalty === 'number')
    payload.frequency_penalty = body.frequency_penalty;
  if (typeof body.presence_penalty === 'number')
    payload.presence_penalty = body.presence_penalty;

  try {
    const upstream = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
        ...(provider.isOpenRouter
          ? {
              'HTTP-Referer': 'https://luxury-listings-portal.vercel.app',
              'X-Title': 'Luxury Listings Portal',
            }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    // Pass the provider's status and JSON straight through so existing client
    // error handling (503 / 413 / rate-limit) keeps working unchanged.
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (error) {
    res.status(502).json({
      error: { message: error?.message || 'AI upstream request failed' },
    });
  }
}
