// User Role Mapping for Real Authentication
// This maps real Google accounts to their assigned roles

export const USER_ROLE_MAPPING = {
  // Admin users - can switch between all profiles
  'jrsschroeder@gmail.com': {
    role: 'admin',
    canSwitchProfiles: true,
    allowedRoles: ['admin', 'content_director', 'social_media_manager', 'hr_manager', 'sales_manager']
  },
  
  // Regular users - restricted to their assigned role
  'joshua@luxury-listings.com': {
    role: 'content_director',
    canSwitchProfiles: false,
    allowedRoles: ['content_director']
  },
  
  'joshua.mitchell@luxuryrealestate.com': {
    role: 'content_director',
    canSwitchProfiles: false,
    allowedRoles: ['content_director']
  },
  
  'michelle.chen@luxuryrealestate.com': {
    role: 'social_media_manager',
    canSwitchProfiles: false,
    allowedRoles: ['social_media_manager']
  },
  
  'matthew.rodriguez@luxuryrealestate.com': {
    role: 'hr_manager',
    canSwitchProfiles: false,
    allowedRoles: ['hr_manager']
  },
  
  'emily.watson@luxuryrealestate.com': {
    role: 'sales_manager',
    canSwitchProfiles: false,
    allowedRoles: ['sales_manager']
  }
};

// Helper function to get user role mapping
export function getUserRoleMapping(email) {
  return USER_ROLE_MAPPING[email] || null;
}

// Helper function to check if user can switch to a specific role
export function canUserSwitchToRole(email, targetRole) {
  const mapping = getUserRoleMapping(email);
  if (!mapping) return false;
  
  return mapping.canSwitchProfiles && mapping.allowedRoles.includes(targetRole);
}

// Helper function to get all allowed roles for a user
export function getAllowedRolesForUser(email) {
  const mapping = getUserRoleMapping(email);
  if (!mapping) return [];
  
  return mapping.allowedRoles;
}

// Default role for new/unmapped users
export const DEFAULT_ROLE = 'content_director';
export const DEFAULT_CAN_SWITCH = false;
