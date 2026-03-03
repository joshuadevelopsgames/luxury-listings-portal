/**
 * Unified Permission Resolver
 *
 * Only what you set in Users & Permissions grants access (no role-based grants):
 *   1. System Admin → full access (always)
 *   2. Custom granular permissions (approved_users.customPermissions)
 *   3. Page permissions (approved_users.pagePermissions)
 *   4. Feature permissions (approved_users.featurePermissions)
 *   5. adminPermissions flag (bundle: approve_time_off, view_analytics, manage_clients, etc.)
 *
 * Roles do NOT grant permissions; they are display-only. Toggles in the UI are the source of truth.
 */

import { PERMISSIONS } from '../entities/Permissions';

/**
 * Unified permission check.
 *
 * @param {object} params
 * @param {string} params.permission - The permission to check (e.g. 'manage_clients', page ID like 'clients')
 * @param {string[]} params.customPermissions - User's customPermissions array
 * @param {string[]} params.pagePermissions - User's page permission IDs
 * @param {string[]} params.featurePermissions - User's feature permission IDs
 * @param {boolean} params.isAdmin - Whether user is a system admin
 * @param {boolean} params.adminPermissions - Whether user has the adminPermissions flag
 * @returns {boolean}
 */
export function resolvePermission({
  permission,
  customPermissions = [],
  pagePermissions = [],
  featurePermissions = [],
  isAdmin = false,
  adminPermissions = false,
}) {
  // 1. System admin: always yes
  if (isAdmin) return true;

  // 2. Custom granular permissions
  if (customPermissions.includes(permission)) return true;

  // 3. Page permissions
  if (pagePermissions.includes(permission)) return true;

  // 4. Feature permissions (from PermissionsManager)
  if (featurePermissions.includes(permission)) return true;

  // 5. adminPermissions flag (grants a fixed feature bundle)
  if (adminPermissions) {
    const adminFeatures = ['approve_time_off', 'view_analytics', 'manage_clients', 'assign_client_managers', 'edit_client_packages'];
    if (adminFeatures.includes(permission)) return true;
  }

  return false;
}

/**
 * Get all effective permissions for a user (from UI only; no role grants).
 */
export function getEffectivePermissions({
  customPermissions = [],
  pagePermissions = [],
  featurePermissions = [],
  isAdmin = false,
}) {
  if (isAdmin) {
    return {
      pages: ['*'],
      features: Object.values(PERMISSIONS),
    };
  }
  return {
    pages: [...new Set(pagePermissions)],
    features: [...new Set([...featurePermissions, ...customPermissions])],
  };
}
