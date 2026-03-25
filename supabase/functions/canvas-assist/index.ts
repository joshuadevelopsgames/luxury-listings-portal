/**
 * Supabase Edge Function: canvas-assist
 * Replaces Firebase Cloud Function: canvasAssist
 *
 * AI assistance for Canvas/Workspaces: summarize, expand, change tone.
 *
 * POST body: { action: 'summarize'|'expand'|'tone', content: string, tone?: string }
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

    const { action, content, tone = 'professional' } = await req.json();

    if (!action || !content) {
      return new Response(JSON.stringify({ error: 'action and content are required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const prompts: Record<string, string> = {
      summarize: `Summarize the following text concisely in 2-3 sentences. Return only the summary, no preamble:\n\n${content.substring(0, 4000)}`,
      expand: `Expand the following text with more detail and context. Keep the same tone and style. Return only the expanded text:\n\n${content.substring(0, 4000)}`,
      tone: `Rewrite the following text in a ${tone} tone. Keep the same meaning and information. Return only the rewritten text:\n\n${content.substring(0, 4000)}`,
    };

    if (!prompts[action]) {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}. Use summarize, expand, or tone.` }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = {
      messages: [{ role: 'user', content: prompts[action] }],
      max_tokens: 800,
      temperature: 0.5,
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

    const result = data.choices?.[0]?.message?.content?.trim() || '';

    return new Response(JSON.stringify({ success: true, result, action }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('canvas-assist error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
