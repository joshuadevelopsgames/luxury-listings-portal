export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawUrl = req.query?.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    res.status(400).json({ error: 'Missing url query param' });
    return;
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  try {
    const response = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SMMLuxuryBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) {
      res.status(422).json({ error: `Failed to fetch listing (${response.status})` });
      return;
    }

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);

    const title = (ogTitleMatch?.[1] || h1Match?.[1] || titleMatch?.[1] || '').trim();
    const description = (ogDescMatch?.[1] || metaDescMatch?.[1] || '').trim();

    res.status(200).json({
      sourceDomain: parsed.hostname,
      title,
      description,
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to scrape listing' });
  }
}
