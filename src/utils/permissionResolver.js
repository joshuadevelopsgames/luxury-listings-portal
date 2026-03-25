/**
 * Simplified Permission Resolver (March 2026)
 *
 * Page access is the only permission boundary:
 *   1. System Admin → full access (always)
 *   2. Page permissions (approved_users.pagePermissions) → can see + do everything on the page
 *
 * Feature/custom permissions have been removed. If you can access a page, you
 * have full control over everything on it.
 */

/**
 * Check if a user has a given permission (page access).
 *
 * @param {object} params
 * @param {string} params.permission - The page ID to check
 * @param {string[]} params.pagePermissions - User's page permission IDs
 * @param {boolean} params.isAdmin - Whether user is a system admin
 * @returns {boolean}
 */
export function resolvePermission({
  permission,
  pagePermissions = [],
  isAdmin = false,
  // Deprecated params kept for call-site compat (ignored)
  customPermissions,
  featurePermissions,
}) {
  if (isAdmin) return true;
  if (pagePermissions.includes(permission)) return true;
  return false;
}

/**
 * Get all effective permissions for a user.
 */
export function getEffectivePermissions({
  pagePermissions = [],
  isAdmin = false,
}) {
  if (isAdmin) {
    return { pages: ['*'], features: [] };
  }
  return {
    pages: [...new Set(pagePermissions)],
    features: [],
  };
}
