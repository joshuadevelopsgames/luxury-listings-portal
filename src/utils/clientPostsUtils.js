/**
 * Helpers for client posts: supports legacy (postsRemaining number) and per-platform (postsRemainingByPlatform).
 */

export function getPostsRemaining(client) {
  if (!client) return 0;
  const byPlatform = client.postsRemainingByPlatform;
  if (byPlatform && typeof byPlatform === 'object') {
    return Object.values(byPlatform).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }
  return Math.max(0, Number(client.postsRemaining) ?? 0);
}

export function getPostsUsed(client) {
  if (!client) return 0;
  const byPlatform = client.postsUsedByPlatform;
  if (byPlatform && typeof byPlatform === 'object') {
    return Object.values(byPlatform).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }
  return Math.max(0, Number(client.postsUsed) ?? 0);
}

/** Platform keys used for posts (must match client.platforms keys). */
export const PLATFORM_KEYS = ['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'x'];

/** Get enabled platform keys for a client (from client.platforms). */
export function getEnabledPlatforms(client) {
  const p = client?.platforms;
  if (!p || typeof p !== 'object') return [];
  return PLATFORM_KEYS.filter((key) => p[key]);
}

/**
 * Compute client update payload when logging (delta=1) or removing (delta=-1) one post for a platform.
 * Returns { postsUsed, postsRemaining, postsRemainingByPlatform?, postsUsedByPlatform? } for updateClient.
 */
export function getPostLogUpdate(client, platform, delta) {
  const byRemaining = client?.postsRemainingByPlatform;
  const byUsed = client?.postsUsedByPlatform;
  if (byRemaining && typeof byRemaining === 'object' && platform && (byRemaining[platform] !== undefined)) {
    const nextRemaining = { ...byRemaining };
    const nextUsed = {};
    Object.keys(byRemaining).forEach((k) => { nextUsed[k] = (byUsed && byUsed[k]) || 0; });
    nextRemaining[platform] = Math.max(0, (nextRemaining[platform] || 0) - delta);
    nextUsed[platform] = Math.max(0, (nextUsed[platform] || 0) + delta);
    const postsRemaining = Object.values(nextRemaining).reduce((s, n) => s + (Number(n) || 0), 0);
    const postsUsed = Object.values(nextUsed).reduce((s, n) => s + (Number(n) || 0), 0);
    return { postsRemaining, postsUsed, postsRemainingByPlatform: nextRemaining, postsUsedByPlatform: nextUsed };
  }
  const postsUsed = Math.max(0, (Number(client?.postsUsed) ?? 0) + delta);
  const postsRemaining = Math.max(0, (Number(client?.postsRemaining) ?? 0) - delta);
  return { postsUsed, postsRemaining };
}
