/**
 * Supabase Edge Function: extract-instagram-metrics
 *
 * Replaces Firebase Cloud Function: extractInstagramMetricsAI
 *
 * Accepts base64-encoded or URL-referenced Instagram screenshots and
 * uses GPT-4o-mini vision to extract structured metrics.
 *
 * Rate limiting is handled via a rate_limits table in Supabase.
 *
 * POST body: { images: [{ base64?: string, url?: string }] }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';
const OPENAI_MODEL = 'gpt-4o-mini';

const RATE_LIMITS = {
  maxPerHour: 50,
  maxPerDay: 200,
  maxImages: 10,
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Rate limit ────────────────────────────────────────────────────────
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'openai');
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: rateLimitResult.message }), {
        status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Validate body ─────────────────────────────────────────────────────
    const { images } = await req.json();
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: 'images array is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (images.length > RATE_LIMITS.maxImages) {
      return new Response(JSON.stringify({ error: `Max ${RATE_LIMITS.maxImages} images per request` }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Build AI request ──────────────────────────────────────────────────
    const imageContents = images.map((img: { base64?: string; url?: string }) => ({
      type: 'image_url',
      image_url: {
        url: img.base64 ? `data:image/jpeg;base64,${img.base64}` : img.url,
        detail: 'high',
      },
    }));

    const prompt = `You are an expert at reading Instagram Insights screenshots. Extract metrics and return ONLY a valid JSON object — no markdown, no explanation.

CRITICAL FIELD DEFINITIONS (read carefully to avoid mixing up similar fields):

1. "views" — The total view count shown in the Views donut chart (e.g. 8,378). NOT the same as interactions or accounts reached.
2. "interactions" — The total interaction count shown in the Interactions donut chart (e.g. 259). This is the number INSIDE the Interactions circle. NOT accounts reached (1,288).
3. "accountsReached" — Labeled "Accounts reached" (e.g. 1,288). Separate from interactions.
4. "profileVisits" — Labeled "Profile visits" under "Profile activity" (e.g. 62).
5. "followers" — The current follower count (e.g. 86). NOT a percentage.
6. "likes", "comments", "shares", "saves", "reposts" — Individual engagement counts shown as icons or labels.
7. "viewsFollowerPercent" — The "Followers" percentage shown in the VIEWS section (e.g. 56.1%). This is about what % of VIEWS came from followers.
8. "viewsNonFollowerPercent" — The "Non-followers" percentage in the VIEWS section (e.g. 43.9%).
9. "interactionsFollowerPercent" — The "Followers" percentage shown in the INTERACTIONS section (e.g. 86.6%). This is about what % of INTERACTIONS came from followers.
10. "gender" — Look ONLY at the Gender tab in the Audience section. "men" = Men % (e.g. 36.3), "women" = Women % (e.g. 63.7). Do NOT use the Country or Age tabs.
11. "topCities" — Look ONLY at the Country tab showing city/country names with percentages. IGNORE tab labels like "Gender", "Country", "Age" — only extract actual place names.
12. "followerChange" — Net follower change number (e.g. -37), shown in Follower Growth section.
13. "growth" — {"overall": net change, "follows": new follows count, "unfollows": unfollows count}.

JSON schema (use null for any field not visible):
{
  "dateRange": "Jan 1 - Jan 31",
  "views": number,
  "viewsFollowerPercent": number,
  "viewsNonFollowerPercent": number,
  "interactions": number,
  "interactionsFollowerPercent": number,
  "likes": number,
  "comments": number,
  "shares": number,
  "saves": number,
  "reposts": number,
  "accountsReached": number,
  "accountsReachedChange": "+X%" or "-X%",
  "profileVisits": number,
  "profileVisitsChange": "+X%" or "-X%",
  "followers": number,
  "followerChange": number,
  "growth": {"overall": number, "follows": number, "unfollows": number},
  "topCities": [{"name": "CityName", "percentage": number}],
  "ageRanges": [{"range": "25-34", "percentage": number}],
  "gender": {"men": number, "women": number}
}

Return ONLY the JSON object.`;

    const body = {
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...imageContents] }],
      max_tokens: 2000,
      temperature: 0.1,
    };

    // ── Call AI (OpenRouter → OpenAI fallback) ────────────────────────────
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    if (!openRouterKey && !openAIKey) {
      return new Response(JSON.stringify({ error: 'No AI provider key configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    let data: any;
    let provider: string;

    // Helper: fetch with a 45-second AbortController timeout
    const fetchWithTimeout = (url: string, init: RequestInit, timeoutMs = 45000) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      return fetch(url, { ...init, signal: controller.signal })
        .finally(() => clearTimeout(timer));
    };

    if (openRouterKey) {
      try {
        const resp = await fetchWithTimeout(OPENROUTER_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openRouterKey}` },
          body: JSON.stringify({ ...body, model: MODEL }),
        });
        if (resp.ok) { data = await resp.json(); provider = 'openrouter'; }
        else throw new Error(await resp.text());
      } catch (e: any) {
        if (!openAIKey) throw new Error(`OpenRouter failed and no OpenAI key configured: ${e.message}`);
        console.warn('OpenRouter failed, falling back to OpenAI:', e.message);
        const resp = await fetchWithTimeout(OPENAI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAIKey}` },
          body: JSON.stringify({ ...body, model: OPENAI_MODEL }),
        });
        if (!resp.ok) throw new Error(await resp.text());
        data = await resp.json(); provider = 'openai';
      }
    } else {
      const resp = await fetchWithTimeout(OPENAI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAIKey!}` },
        body: JSON.stringify({ ...body, model: OPENAI_MODEL }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      data = await resp.json(); provider = 'openai';
    }

    // ── Parse response ────────────────────────────────────────────────────
    let content = data.choices[0].message.content as string;
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const metrics = JSON.parse(content);

    // Remove null values
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(metrics)) {
      if (v !== null && v !== undefined) cleaned[k] = v;
    }

    return new Response(JSON.stringify({ success: true, metrics: cleaned, provider }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('extract-instagram-metrics error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

// ── Rate limit helper (stored in Supabase) ────────────────────────────────
async function checkRateLimit(supabase: any, userId: string, feature: string) {
  const limits = RATE_LIMITS;
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await supabase
    .from('rate_limit_requests')
    .select('created_at')
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', dayAgo);

  const recentRequests = rows || [];
  const lastHour = recentRequests.filter((r: any) => r.created_at >= hourAgo).length;
  const lastDay = recentRequests.length;

  if (lastHour >= limits.maxPerHour) {
    return { allowed: false, message: `Rate limit: max ${limits.maxPerHour} requests per hour` };
  }
  if (lastDay >= limits.maxPerDay) {
    return { allowed: false, message: `Rate limit: max ${limits.maxPerDay} requests per day` };
  }

  // Log this request
  await supabase.from('rate_limit_requests').insert({ user_id: userId, feature });

  return { allowed: true, remaining: Math.min(limits.maxPerHour - lastHour - 1, limits.maxPerDay - lastDay - 1) };
}
