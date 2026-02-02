/**
 * Get Instagram embed URL for a post or reel link.
 * Instagram supports: /p/SHORTCODE/ and /reel/SHORTCODE/ (or /reels/).
 * @param {string} url - Full Instagram post/reel URL
 * @returns {string|null} Embed URL or null if not a supported Instagram URL
 */
export function getInstagramEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  // Match /p/SHORTCODE or /reel/SHORTCODE or /reels/SHORTCODE (optional trailing slash and query)
  const postMatch = trimmed.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/i);
  const reelMatch = trimmed.match(/instagram\.com\/reels?\/([A-Za-z0-9_-]+)/i);
  const shortcode = postMatch?.[1] || reelMatch?.[1];
  if (!shortcode) return null;
  const type = postMatch ? 'p' : 'reel';
  return `https://www.instagram.com/${type}/${shortcode}/embed/`;
}
