/**
 * Supabase Edge Function: run-health-check
 * Replaces Firebase Cloud Function: runBulkHealthPrediction
 *
 * Runs AI health prediction for one or all clients.
 * Uses the last 6 months of Instagram reports + engagement data.
 *
 * POST body: { client_id?: string }  (omit for bulk run on all clients)
 *
 * Requires: OPENAI_API_KEY or OPENROUTER_API_KEY
 * Requires: service_role key (called server-side only via Edge Function secret)
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
    // ── Auth (must be admin/director) ─────────────────────────────────────
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

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'director', 'manager'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for writes
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { client_id } = await req.json().catch(() => ({}));

    // ── Load clients ──────────────────────────────────────────────────────
    let clientsQuery = adminClient.from('clients').select('id, name, status').eq('status', 'active');
    if (client_id) clientsQuery = clientsQuery.eq('id', client_id);
    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError || !clients?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'No clients found' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    if (!openRouterKey && !openAIKey) {
      return new Response(JSON.stringify({ error: 'No AI provider key configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    const results: any[] = [];

    for (const client of clients) {
      try {
        // Load last 6 Instagram reports
        const { data: reports } = await adminClient
          .from('instagram_reports')
          .select('period_start, period_end, followers_start, followers_end, total_reach, engagement_rate, likes, comments, saves, posts_count')
          .eq('client_id', client.id)
          .order('period_start', { ascending: false })
          .limit(6);

        if (!reports?.length) {
          results.push({ client_id: client.id, name: client.name, skipped: true, reason: 'no reports' });
          continue;
        }

        // Build metrics summary for AI
        const latest = reports[0];
        const avgEngagement = reports.reduce((s, r) => s + (r.engagement_rate || 0), 0) / reports.length;
        const followerTrend = reports.length > 1
          ? ((latest.followers_end || 0) - (reports[reports.length - 1].followers_start || 0))
          : 0;

        const prompt = `You are an AI analyst evaluating the health of a social media client account.

Client: ${client.name}
Reports analyzed: ${reports.length} months

Latest metrics:
- Followers: ${latest.followers_end || 'N/A'}
- Reach: ${latest.total_reach || 'N/A'}
- Engagement rate: ${latest.engagement_rate || 'N/A'}%
- Likes: ${latest.likes || 'N/A'}, Comments: ${latest.comments || 'N/A'}, Saves: ${latest.saves || 'N/A'}
- Posts: ${latest.posts_count || 'N/A'}

Trends (last ${reports.length} months):
- Avg engagement rate: ${avgEngagement.toFixed(2)}%
- Follower change: ${followerTrend > 0 ? '+' : ''}${followerTrend}

Based on this data, classify the account health and provide a brief summary.
Return ONLY valid JSON:
{
  "status": "healthy" | "monitor" | "at_risk",
  "score": 0-100,
  "summary": "2-3 sentence explanation of the health status and key factors",
  "factors": {
    "engagement": "positive" | "neutral" | "negative",
    "growth": "positive" | "neutral" | "negative",
    "consistency": "positive" | "neutral" | "negative"
  }
}`;

        const body = {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.3,
        };

        let aiData: any;
        if (openRouterKey) {
          const resp = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openRouterKey}` },
            body: JSON.stringify({ ...body, model: 'openai/gpt-4o-mini' }),
          });
          aiData = await resp.json();
        } else {
          const resp = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAIKey!}` },
            body: JSON.stringify({ ...body, model: 'gpt-4o-mini' }),
          });
          aiData = await resp.json();
        }

        let content = aiData.choices?.[0]?.message?.content?.trim() || '';
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const prediction = JSON.parse(content);

        // Write health snapshot
        await adminClient.from('client_health_snapshots').insert({
          client_id: client.id,
          status: prediction.status,
          score: prediction.score,
          summary: prediction.summary,
          factors: prediction.factors,
        });

        // Update client health_status
        await adminClient
          .from('clients')
          .update({ health_status: prediction.status, health_score: prediction.score })
          .eq('id', client.id);

        results.push({ client_id: client.id, name: client.name, status: prediction.status, score: prediction.score });
        processed++;
      } catch (clientErr: any) {
        console.error(`Health check failed for ${client.name}:`, clientErr);
        results.push({ client_id: client.id, name: client.name, error: clientErr.message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed, results }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('run-health-check error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
