/**
 * Supabase Edge Function: generate-report-summary
 * Replaces Firebase Cloud Function: generateReportSummary
 *
 * Generates a 3-5 sentence client-facing Instagram report summary.
 *
 * POST body: { metrics: object, dateRange?: string, clientName?: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
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

    const { metrics = {}, dateRange = '', clientName = '' } = await req.json();
    if (!metrics || typeof metrics !== 'object') {
      return new Response(JSON.stringify({ error: 'metrics object is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a social media account manager writing a short summary for a client's Instagram report. The client will read this, so write as their SMM: friendly, clear, and insightful.

Rules:
- Always refer to the account as "your account". If a client/account name is provided, you may add it once for clarity (e.g. "Your account (Blair Chang)..."), but never use the client name as the subject.
- Tone: professional but casual and friendly.
- Be insightful, not descriptive. Avoid weak phrasing. Be concrete: use a key number when it tells the story, then say what it means.
- 3-5 sentences. No bullet lists. No preamble. Always end on a positive or neutral note. Do not use em dashes (—). Output only the summary paragraph.`;

    const userPrompt = `Using this Instagram Insights data, write a short, insightful summary.

1. Lead with what went well — be specific. Always say "your account".
2. Name the best-performing content type and what it means.
3. One standout number or win and what it means.
4. If something dropped, mention it in the middle — never end on a negative.

Avoid: generic analyst language, em dashes. Do not end with a call to action.

Date range: ${dateRange || 'Not specified'}
${clientName ? `Account name (for clarity only): ${clientName}` : ''}

Metrics (JSON):
${JSON.stringify(metrics, null, 0).substring(0, 8000)}`;

    const body = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 400,
      temperature: 0.4,
    };

    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    if (!openRouterKey && !openAIKey) {
      return new Response(JSON.stringify({ error: 'No AI provider key configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    let data: any;

    if (openRouterKey) {
      const resp = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openRouterKey}` },
        body: JSON.stringify({ ...body, model: 'openai/gpt-4o-mini' }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      data = await resp.json();
    } else {
      const resp = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAIKey!}` },
        body: JSON.stringify({ ...body, model: 'gpt-4o-mini' }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      data = await resp.json();
    }

    const summary = data.choices?.[0]?.message?.content?.trim() || '';

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('generate-report-summary error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
