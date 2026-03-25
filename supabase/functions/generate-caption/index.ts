/**
 * Supabase Edge Function: generate-caption
 * Replaces Firebase Cloud Function: generateCaption
 *
 * Generates luxury real estate social media captions using GPT-4o-mini.
 *
 * POST body: { description: string, platform?: string, tone?: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_GUIDELINES: Record<string, string> = {
  instagram: 'Instagram: 2200 char max, use line breaks for readability, up to 30 hashtags (include 15-20 relevant ones), use occasional emojis',
  facebook: 'Facebook: Conversational tone, 1-3 hashtags only, can be longer form, no excessive emojis',
  linkedin: 'LinkedIn: Professional tone, no hashtags or only 3-5 industry ones, focus on value and insights, no emojis',
  twitter: 'Twitter/X: Under 280 characters total including hashtags, punchy and engaging, 2-3 hashtags max',
  youtube: 'YouTube: Title-style or description format, include relevant keywords, 3-5 hashtags',
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

    // ── Validate body ─────────────────────────────────────────────────────
    const { description, platform = 'instagram', tone = 'luxury' } = await req.json();
    if (!description || typeof description !== 'string' || description.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'description is required (min 3 chars)' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Build prompts ─────────────────────────────────────────────────────
    const systemPrompt = `You are an expert social media copywriter for luxury real estate. Write captions that are aspirational, sophisticated, and engaging. Your tone should be ${tone === 'luxury' ? 'elegant and premium' : tone}.`;

    const userPrompt = `Write a ${platform} caption for this luxury real estate content:

"${description.substring(0, 1000)}"

Platform requirements: ${PLATFORM_GUIDELINES[platform] || PLATFORM_GUIDELINES.instagram}

Return ONLY valid JSON in this format:
{
  "caption": "The full caption text with line breaks as \\n",
  "hashtags": ["hashtag1", "hashtag2", "..."]
}

Do not include # symbols in the hashtags array. Do not include any markdown or explanation outside the JSON.`;

    const body = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.7,
    };

    // ── Call AI ───────────────────────────────────────────────────────────
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    if (!openRouterKey && !openAIKey) {
      return new Response(JSON.stringify({ error: 'No AI provider key configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    let data: any;
    let provider: string;

    if (openRouterKey) {
      const resp = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openRouterKey}` },
        body: JSON.stringify({ ...body, model: 'openai/gpt-4o-mini' }),
      });
      if (!resp.ok) throw new Error(`OpenRouter error: ${await resp.text()}`);
      data = await resp.json(); provider = 'openrouter';
    } else {
      const resp = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAIKey!}` },
        body: JSON.stringify({ ...body, model: 'gpt-4o-mini' }),
      });
      if (!resp.ok) throw new Error(`OpenAI error: ${await resp.text()}`);
      data = await resp.json(); provider = 'openai';
    }

    // ── Parse ─────────────────────────────────────────────────────────────
    let content = (data.choices?.[0]?.message?.content as string || '').trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(content);

    if (!result.caption) throw new Error('No caption in AI response');

    return new Response(JSON.stringify({
      success: true,
      caption: result.caption,
      hashtags: result.hashtags || [],
      platform,
      provider,
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('generate-caption error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
