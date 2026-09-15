/**
 * Pull the post type and shortcode out of an Instagram post or reel link.
 * Instagram supports: /p/SHORTCODE/ and /reel/SHORTCODE/ (or /reels/).
 * @param {string} url - Full Instagram post/reel URL
 * @returns {{type: 'p'|'reel', shortcode: string}|null}
 */
function parseInstagramPostUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  // Match /p/SHORTCODE or /reel/SHORTCODE or /reels/SHORTCODE (optional trailing slash and query).
  // Instagram's share links now often carry the username first
  // (instagram.com/theagency.austin/p/SHORTCODE/), so allow one handle segment.
  const postMatch = trimmed.match(/instagram\.com\/(?:[A-Za-z0-9._]+\/)?p\/([A-Za-z0-9_-]+)/i);
  const reelMatch = trimmed.match(/instagram\.com\/(?:[A-Za-z0-9._]+\/)?reels?\/([A-Za-z0-9_-]+)/i);
  const shortcode = postMatch?.[1] || reelMatch?.[1];
  if (!shortcode) return null;
  return { type: postMatch ? 'p' : 'reel', shortcode };
}

/**
 * Get Instagram embed URL for a post or reel link.
 * @param {string} url - Full Instagram post/reel URL
 * @returns {string|null} Embed URL or null if not a supported Instagram URL
 */
export function getInstagramEmbedUrl(url) {
  const post = parseInstagramPostUrl(url);
  return post ? `https://www.instagram.com/${post.type}/${post.shortcode}/embed/` : null;
}

/**
 * Clean public link for a post or reel — no username segment, share token or
 * tracking params (copied links arrive as ?utm_source=ig_web_copy_link&stkn=…).
 * @param {string} url - Full Instagram post/reel URL
 * @returns {string|null} Canonical post URL or null if not a supported Instagram URL
 */
export function getInstagramPostUrl(url) {
  const post = parseInstagramPostUrl(url);
  return post ? `https://www.instagram.com/${post.type}/${post.shortcode}/` : null;
}
