// User Role Mapping
//
// Previously hardcoded with placeholder emails. Now derives everything from
// the user's DB profile (currentUser.roles) so new team members work
// automatically without touching this file.
//
// Email convention:
//   • Team members: <firstname>@luxury-listings.com
//   • Owner / bootstrap admin: jrsschroeder@gmail.com

import { isSystemAdmin } from '../utils/systemAdmins';

/**
 * Get role mapping for any user based on their DB profile.
 * System admins can always switch profiles and have all roles.
 */
export function getUserRoleMapping(email, currentUser = null) {
  if (!email) return null;

  if (isSystemAdmin(email)) {
    return {
      role: 'admin',
      canSwitchProfiles: true,
      allowedRoles: ['admin', 'content_director', 'social_media_manager', 'hr_manager', 'sales_manager'],
    };
  }

  // Regular users — derive from their DB profile
  const roles = currentUser?.roles || [currentUser?.primaryRole || currentUser?.role || 'content_director'];
  return {
    role: roles[0] || 'content_director',
    canSwitchProfiles: roles.length > 1,
    allowedRoles: roles,
  };
}

/** Check if user can switch to a specific role */
export function canUserSwitchToRole(email, targetRole, currentUser = null) {
  const mapping = getUserRoleMapping(email, currentUser);
  if (!mapping) return false;
  return mapping.canSwitchProfiles && mapping.allowedRoles.includes(targetRole);
}

/** Get all allowed roles for a user */
export function getAllowedRolesForUser(email, currentUser = null) {
  const mapping = getUserRoleMapping(email, currentUser);
  if (!mapping) return [];
  return mapping.allowedRoles;
}

// Default role for new/unmapped users
export const DEFAULT_ROLE = 'content_director';
export const DEFAULT_CAN_SWITCH = false;
