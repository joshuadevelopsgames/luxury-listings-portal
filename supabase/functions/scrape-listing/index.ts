/**
 * Supabase Edge Function: scrape-listing
 *
 * Extracts structured property data from a listing URL.
 * verify_jwt = false in config.toml — auth handled inside.
 *
 * Strategy:
 *   1. Zillow URLs  → Apify `maxcopell/zillow-detail-scraper` actor (rich structured data)
 *   2. All others   → Fetch HTML → parse OG tags → GPT-4o-mini to extract structure
 *
 * POST body: { url: string }
 * Response:  { title, address, price, beds, baths, squareFeet, description, sourceDomain, photos }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ── OG tag parser ─────────────────────────────────────────────────────────────

function parseOG(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const tagRe = /<meta\s[^>]+>/gi;
  const propRe = /(?:property|name)=["']([^"']+)["']/i;
  const contRe = /content=["']([^"']*)["']/i;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const prop = propRe.exec(m[0]);
    const cont = contRe.exec(m[0]);
    if (prop && cont) meta[prop[1].toLowerCase()] = cont[1];
  }
  // Also grab <title>
  const titleM = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (titleM && !meta['og:title']) meta['og:title'] = titleM[1].trim();
  return meta;
}

function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// ── Apify: call Zillow Detail Scraper ─────────────────────────────────────────

async function scrapeWithApify(listingUrl: string): Promise<Record<string, unknown> | null> {
  const token = Deno.env.get('APIFY_API_TOKEN');
  if (!token) return null;

  const ACTOR = 'maxcopell~zillow-detail-scraper';

  // 1. Start the run (synchronous wait up to 40s — client timeout is 50s)
  const runResp = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/runs?token=${token}&waitForFinish=40`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: listingUrl }],
        maxItems: 1,
      }),
    }
  );

  if (!runResp.ok) {
    console.error('Apify run failed:', await runResp.text());
    return null;
  }

  const run = await runResp.json();
  const datasetId = run?.data?.defaultDatasetId;
  if (!datasetId) {
    console.error('No datasetId in Apify run response');
    return null;
  }

  // 2. Fetch dataset items
  const itemsResp = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&limit=1`
  );

  if (!itemsResp.ok) {
    console.error('Apify dataset fetch failed:', await itemsResp.text());
    return null;
  }

  const items = await itemsResp.json();
  const item = Array.isArray(items) ? items[0] : null;
  if (!item) return null;

  // 3. Map Apify output → our schema
  const addr = item.address || {};
  const addressParts = [
    addr.streetAddress,
    addr.city,
    addr.state,
    addr.zipcode,
  ].filter(Boolean);

  return {
    title: item.hdpData?.homeInfo?.streetAddress || addr.streetAddress || '',
    address: addressParts.join(', '),
    price: item.price ? `$${Number(item.price).toLocaleString()}` : '',
    beds: item.bedrooms != null ? String(item.bedrooms) : '',
    baths: item.bathrooms != null ? String(item.bathrooms) : '',
    squareFeet: item.livingArea ? String(item.livingArea) : '',
    description: item.description || '',
    sourceDomain: 'zillow.com',
    photos: Array.isArray(item.photos)
      ? item.photos.slice(0, 10).map((p: unknown) =>
          typeof p === 'string' ? p : (p as Record<string, string>)?.url || ''
        ).filter(Boolean)
      : [],
    yearBuilt: item.yearBuilt ? String(item.yearBuilt) : '',
  };
}

// ── GPT-4o-mini: extract structure from OG text ──────────────────────────────

async function extractWithGPT(
  pageTitle: string,
  description: string,
  url: string
): Promise<Record<string, string>> {
  const key = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('OPENAI_API_KEY');
  if (!key) return {};

  const isOpenRouter = !!Deno.env.get('OPENROUTER_API_KEY');
  const endpoint = isOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const prompt = `Extract property listing details from this real estate page metadata.

Page title: ${pageTitle}
Description: ${description}
URL: ${url}

Return ONLY valid JSON with these exact keys (use empty string if not found):
{
  "title": "short property title e.g. '3 bed house at 123 Main St'",
  "address": "full street address",
  "price": "price as formatted string e.g. '$1,250,000'",
  "beds": "number of bedrooms as string",
  "baths": "number of bathrooms as string",
  "squareFeet": "square footage as string",
  "description": "property description cleaned up, max 500 chars"
}`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: isOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You extract structured data from real estate listing metadata. Return only valid JSON, no markdown.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
      temperature: 0,
    }),
  });

  if (!resp.ok) return {};

  const data = await resp.json();
  let content = (data.choices?.[0]?.message?.content as string || '').trim();
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// ── OG fallback: fetch + parse + GPT extract ─────────────────────────────────

async function scrapeWithOG(listingUrl: string): Promise<Record<string, unknown>> {
  const domain = sourceDomain(listingUrl);
  let og: Record<string, string> = {};

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(listingUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeout);

    if (resp.ok) {
      const html = await resp.text();
      og = parseOG(html);
    }
  } catch {
    // Non-fatal — site might block server-side fetches
  }

  const pageTitle = og['og:title'] || og['title'] || '';
  const pageDesc = og['og:description'] || og['description'] || '';

  // Use GPT to pull structured fields out of whatever text we have
  const extracted = pageTitle || pageDesc
    ? await extractWithGPT(pageTitle, pageDesc, listingUrl)
    : {};

  return {
    title: extracted.title || pageTitle || '',
    address: extracted.address || '',
    price: extracted.price || '',
    beds: extracted.beds || '',
    baths: extracted.baths || '',
    squareFeet: extracted.squareFeet || '',
    description: extracted.description || pageDesc || '',
    sourceDomain: domain,
    photos: og['og:image'] ? [og['og:image']] : [],
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Auth — verify the caller has a valid Supabase session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return json({ error: 'url is required' }, 400);
    }

    const isZillow = url.includes('zillow.com');

    if (isZillow) {
      const result = await scrapeWithApify(url);
      if (result) {
        return json({ ...result, provider: 'apify' });
      }
      // Apify failed — fall through to OG
      console.warn('Apify scrape failed, falling back to OG for Zillow URL');
    }

    // OG + GPT fallback for non-Zillow or Apify failure
    const result = await scrapeWithOG(url);
    return json({ ...result, provider: 'og' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('scrape-listing error:', msg);
    return json({ error: msg }, 500);
  }
});
