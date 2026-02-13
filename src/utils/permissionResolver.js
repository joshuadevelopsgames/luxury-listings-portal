/**
 * Unified Permission Resolver
 *
 * Merges the three permission systems into one coherent check:
 *   1. System Admin → full access (always)
 *   2. Page permissions (from PermissionsContext / approved_users.pagePermissions)
 *   3. Feature permissions (from PermissionsContext / approved_users.featurePermissions)
 *   4. Role-based permissions (from UserRoles.js ROLE_PERMISSIONS)
 *   5. Custom granular permissions (from approved_users.customPermissions)
 *
 * BACKWARD COMPATIBILITY:
 * - All existing `hasPermission()` and `hasFeaturePermission()` calls continue to work
 * - Role-based boolean permissions (canViewDashboard, etc.) still resolve from UserRoles.js
 * - The resolver adds a UNIFIED API that callers can migrate to over time
 *
 * This file does NOT change any existing behavior — it layers on top as a single entry point.
 */

import { ROLE_PERMISSIONS } from '../entities/UserRoles';
import { PERMISSIONS } from '../entities/Permissions';

/**
 * Map role-based boolean permissions to their equivalent granular permission strings.
 * This allows a single `can(user, 'manage_clients')` call to check BOTH systems.
 */
const ROLE_PERM_TO_GRANULAR = {
  canManageTeam: PERMISSIONS.MANAGE_TEAM,
  canViewHRData: PERMISSIONS.VIEW_HR_DATA,
  canManageHRData: PERMISSIONS.MANAGE_LEAVE_REQUESTS,
  canViewAnalytics: PERMISSIONS.VIEW_ANALYTICS,
  canViewCRM: PERMISSIONS.MANAGE_CRM,
  canManageLeads: PERMISSIONS.MANAGE_LEADS,
  canViewSalesPipeline: PERMISSIONS.VIEW_SALES_PIPELINE,
  canManageClientPackages: PERMISSIONS.EDIT_CLIENT_PACKAGES,
  canManageSocialContent: PERMISSIONS.CREATE_CONTENT,
  canViewSocialMetrics: PERMISSIONS.VIEW_ANALYTICS,
  canManageUsers: PERMISSIONS.MANAGE_USERS,
  canAssignRoles: PERMISSIONS.ASSIGN_ROLES,
  canApproveUsers: PERMISSIONS.APPROVE_USERS,
  canCreateTasks: PERMISSIONS.CREATE_TASKS,
  canAssignTasks: PERMISSIONS.ASSIGN_TASKS,
  canViewAllTasks: PERMISSIONS.VIEW_ALL_TASKS,
  canManageTutorials: PERMISSIONS.MANAGE_TUTORIALS,
  canCreateTutorials: PERMISSIONS.CREATE_TUTORIALS,
  canDeleteTutorials: PERMISSIONS.DELETE_TUTORIALS,
};

/**
 * Reverse map: granular permission string → role boolean key
 */
const GRANULAR_TO_ROLE_PERM = Object.fromEntries(
  Object.entries(ROLE_PERM_TO_GRANULAR).map(([k, v]) => [v, k])
);

/**
 * Unified permission check.
 *
 * @param {object} params
 * @param {string} params.permission - The permission to check (granular string like 'manage_clients',
 *   OR role boolean key like 'canManageTeam', OR page ID like 'clients')
 * @param {string} params.role - User's current role
 * @param {string[]} params.customPermissions - User's customPermissions array
 * @param {string[]} params.pagePermissions - User's page permission IDs
 * @param {string[]} params.featurePermissions - User's feature permission IDs
 * @param {boolean} params.isAdmin - Whether user is a system admin
 * @param {boolean} params.adminPermissions - Whether user has the adminPermissions flag
 * @returns {boolean}
 */
export function resolvePermission({
  permission,
  role,
  customPermissions = [],
  pagePermissions = [],
  featurePermissions = [],
  isAdmin = false,
  adminPermissions = false,
}) {
  // 1. System admin: always yes
  if (isAdmin) return true;

  // 2. Check custom granular permissions (highest priority for regular users)
  if (customPermissions.includes(permission)) return true;

  // 3. Check page permissions
  if (pagePermissions.includes(permission)) return true;

  // 4. Check feature permissions (from PermissionsManager)
  if (featurePermissions.includes(permission)) return true;

  // 5. Check adminPermissions flag (grants most feature permissions)
  if (adminPermissions && featurePermissions.length === 0) {
    // adminPermissions flag grants approve_time_off, view_analytics, manage_clients, assign_client_managers, edit_client_packages
    const adminFeatures = ['approve_time_off', 'view_analytics', 'manage_clients', 'assign_client_managers', 'edit_client_packages'];
    if (adminFeatures.includes(permission)) return true;
  }

  // 6. Check role-based permissions
  if (role && ROLE_PERMISSIONS[role]) {
    const rolePerms = ROLE_PERMISSIONS[role].permissions;

    // Direct role boolean check (e.g., 'canManageTeam')
    if (permission in rolePerms) {
      return rolePerms[permission] || false;
    }

    // Reverse lookup: granular string → role boolean key
    const rolePerm = GRANULAR_TO_ROLE_PERM[permission];
    if (rolePerm && rolePerms[rolePerm]) return true;
  }

  return false;
}

/**
 * Get all effective permissions for a user (union of all three systems).
 * Useful for displaying what a user can do.
 */
export function getEffectivePermissions({
  role,
  customPermissions = [],
  pagePermissions = [],
  featurePermissions = [],
  isAdmin = false,
}) {
  if (isAdmin) {
    // Admin has everything
    return {
      pages: ['*'], // All pages
      features: Object.values(PERMISSIONS),
      rolePermissions: Object.fromEntries(
        Object.entries(ROLE_PERMISSIONS[role]?.permissions || {}).map(([k]) => [k, true])
      ),
    };
  }

  const rolePerms = ROLE_PERMISSIONS[role]?.permissions || {};

  return {
    pages: [...new Set(pagePermissions)],
    features: [...new Set([...featurePermissions, ...customPermissions])],
    rolePermissions: { ...rolePerms },
  };
}

/**
 * Permission precedence documentation:
 *
 * 1. isSystemAdmin(email) → FULL ACCESS
 * 2. customPermissions[] → Granular overrides assigned per-user
 * 3. pagePermissions[] → Page-level access (sidebar/routing)
 * 4. featurePermissions[] → Feature-level access (within pages)
 * 5. adminPermissions flag → Shorthand for common feature bundle
 * 6. ROLE_PERMISSIONS[role] → Default permissions from role definition
 *
 * When checking a permission, the resolver tries each layer in order.
 * First match wins (grant). If no layer grants, the permission is denied.
 */
