// User Roles and Permissions System
export const USER_ROLES = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  CONTENT_DIRECTOR: 'content_director',
  SOCIAL_MEDIA_MANAGER: 'social_media_manager',
  GRAPHIC_DESIGNER: 'graphic_designer',
  HR_MANAGER: 'hr_manager',
  SALES_MANAGER: 'sales_manager',
  PENDING: 'pending'
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    name: 'System Administrator',
    displayName: 'Admin',
    description: 'Full system access and user management',
    permissions: {
      canViewDashboard: true,
      canManageTutorials: true,
      canCreateTutorials: true,
      canEditTutorials: true,
      canDeleteTutorials: true,
      canViewTasks: true,
      canCreateTasks: true,
      canAssignTasks: true,
      canViewAllTasks: true,
      canManageClientPackages: true,
      canViewResources: true,
      canUploadResources: true,
      canViewAnalytics: true,
      canManageTeam: true,
      canViewHRData: true,
      canManageHRData: true,
      canViewSocialMetrics: true,
      canManageSocialContent: true,
      canManageUsers: true,
      canAssignRoles: true,
      canApproveUsers: true,
      canViewAllProfiles: true,
      canSwitchProfiles: true
    },
    features: [
      'User Management',
      'Role Assignment',
      'System Administration',
      'Full Profile Access',
      'All Features Access',
      'System Monitoring'
    ],
    color: 'red',
    icon: '👑'
  },
  
  [USER_ROLES.DIRECTOR]: {
    name: 'Director',
    displayName: 'Director',
    description: 'Senior leadership with template editing and team oversight',
    permissions: {
      canViewDashboard: true,
      canManageTutorials: true,
      canCreateTutorials: true,
      canEditTutorials: true,
      canDeleteTutorials: false,
      canViewTasks: true,
      canCreateTasks: true,
      canAssignTasks: true,
      canViewAllTasks: true,
      canEditTaskTemplates: true, // Unique to Director
      canManageClientPackages: true,
      canViewResources: true,
      canUploadResources: true,
      canViewAnalytics: true,
      canManageTeam: true,
      canViewHRData: true,
      canManageHRData: false,
      canViewSocialMetrics: true,
      canManageSocialContent: true,
      canViewCRM: true,
      canManageLeads: true,
      canViewSalesPipeline: true
    },
    features: [
      'Task Template Management',
      'Team Oversight',
      'Content Strategy',
      'Performance Analytics',
      'Client Management',
      'Team Leadership'
    ],
    color: 'indigo',
    icon: '🎯'
  },
  
  [USER_ROLES.CONTENT_DIRECTOR]: {
    name: 'Content Manager',
    displayName: 'Content Manager',
    description: 'Oversees all content strategy and creative direction',
    permissions: {
      canViewDashboard: true,
      canManageTutorials: true,
      canCreateTutorials: true,
      canEditTutorials: true,
      canDeleteTutorials: true,
      canViewTasks: true,
      canCreateTasks: true,
      canAssignTasks: true,
      canViewAllTasks: true,
      canManageClientPackages: true,
      canViewResources: true,
      canUploadResources: true,
      canViewAnalytics: true,
      canManageTeam: true,
      canViewHRData: false,
      canManageHRData: false,
      canViewSocialMetrics: true,
      canManageSocialContent: true
    },
    features: [
      'Content Strategy',
      'Creative Direction',
      'Team Management',
      'Performance Analytics',
      'Client Package Management',
      'Resource Library'
    ],
    color: 'blue',
    icon: '🎥'
  },
  
  [USER_ROLES.SOCIAL_MEDIA_MANAGER]: {
    name: 'Social Media Manager',
    displayName: 'Social Media Manager',
    description: 'Manages social media presence and engagement',
    permissions: {
      canViewDashboard: true,
      canManageTutorials: false,
      canCreateTutorials: false,
      canEditTutorials: false,
      canDeleteTutorials: false,
      canViewTasks: true,
      canCreateTasks: false,
      canAssignTasks: false,
      canViewAllTasks: false,
      canManageClientPackages: false,
      canViewResources: true,
      canUploadResources: false,
      canViewAnalytics: true,
      canManageTeam: false,
      canViewHRData: false,
      canManageHRData: false,
      canViewSocialMetrics: true,
      canManageSocialContent: true
    },
    features: [
      'Social Media Management',
      'Content Creation',
      'Engagement Tracking',
      'Performance Metrics',
      'Resource Access'
    ],
    color: 'purple',
    icon: '📱'
  },
  
  [USER_ROLES.GRAPHIC_DESIGNER]: {
    name: 'Graphic Designer',
    displayName: 'Graphic Designer',
    description: 'Creates visual content and graphics for social media and marketing',
    permissions: {
      canViewDashboard: true,
      canManageTutorials: false,
      canCreateTutorials: false,
      canEditTutorials: false,
      canDeleteTutorials: false,
      canViewTasks: true,
      canCreateTasks: false,
      canAssignTasks: false,
      canViewAllTasks: false,
      canManageClientPackages: false,
      canViewResources: true,
      canUploadResources: true,
      canViewAnalytics: false,
      canManageTeam: false,
      canViewHRData: false,
      canManageHRData: false,
      canViewSocialMetrics: true,
      canManageSocialContent: true
    },
    features: [
      'Graphic Design',
      'Visual Content Creation',
      'Resource Library',
      'Social Media Assets',
      'Brand Assets'
    ],
    color: 'pink',
    icon: '🎨'
  },
  
  [USER_ROLES.HR_MANAGER]: {
    name: 'HR Manager',
    displayName: 'HR Manager',
    description: 'Manages HR operations, leave requests, and employee relations',
    permissions: {
      canViewDashboard: true,
      canManageTutorials: false,
      canCreateTutorials: false,
      canEditTutorials: false,
      canDeleteTutorials: false,
      canViewTasks: true,
      canCreateTasks: true,
      canAssignTasks: true,
      canViewAllTasks: true,
      canManageClientPackages: false,
      canViewResources: true,
      canUploadResources: false,
      canViewAnalytics: true,
      canManageTeam: true,
      canViewHRData: true,
      canManageHRData: true,
      canViewSocialMetrics: false,
      canManageSocialContent: false
    },
    features: [
      'Leave Request Management',
      'Performance Reviews',
      'HR Analytics & Reports',
      'Team Calendar Management',
      'Employee Relations',
      'Attendance Tracking'
    ],
    color: 'green',
    icon: '👥'
  },
  
  [USER_ROLES.SALES_MANAGER]: {
    name: 'Sales Manager',
    displayName: 'Sales Manager',
    description: 'Manages sales pipeline and client relationships',
    permissions: {
      canViewDashboard: true,
      canManageTutorials: false,
      canCreateTutorials: false,
      canEditTutorials: false,
      canDeleteTutorials: false,
      canViewTasks: true,
      canCreateTasks: true,
      canAssignTasks: true,
      canViewAllTasks: true,
      canManageClientPackages: true,
      canViewResources: true,
      canUploadResources: false,
      canViewAnalytics: true,
      canManageTeam: false,
      canViewHRData: false,
      canManageHRData: false,
      canViewSocialMetrics: false,
      canManageSocialContent: false,
      canViewCRM: true,
      canManageLeads: true,
      canViewSalesPipeline: true,
      canManageDeals: true,
      canViewSalesReports: true
    },
    features: [
      'CRM Management',
      'Lead Generation',
      'Sales Pipeline',
      'Deal Tracking',
      'Client Relationships',
      'Sales Analytics'
    ],
    color: 'orange',
    icon: '💼'
  },

  [USER_ROLES.PENDING]: {
    name: 'Pending Approval',
    displayName: 'Pending',
    description: 'Account pending administrator approval',
    permissions: {
      canViewDashboard: false,
      canManageTutorials: false,
      canCreateTutorials: false,
      canEditTutorials: false,
      canDeleteTutorials: false,
      canViewTasks: false,
      canCreateTasks: false,
      canAssignTasks: false,
      canViewAllTasks: false,
      canManageClientPackages: false,
      canViewResources: false,
      canUploadResources: false,
      canViewAnalytics: false,
      canManageTeam: false,
      canViewHRData: false,
      canManageHRData: false,
      canViewSocialMetrics: false,
      canManageSocialContent: false,
      canViewCRM: false,
      canManageLeads: false,
      canViewSalesPipeline: false,
      canManageDeals: false,
      canViewSalesReports: false
    },
    features: [
      'Account Pending Approval',
      'Limited Access',
      'Waiting for Role Assignment'
    ],
    color: 'gray',
    icon: '⏳'
  }
};

// Default user templates for each role (used for fallback values during auth)
export const DEFAULT_USER_BY_ROLE = {
  [USER_ROLES.PENDING]: {
    role: USER_ROLES.PENDING,
    department: 'Pending Approval',
    bio: '',
    skills: [],
    stats: {}
  },
  [USER_ROLES.ADMIN]: {
    role: USER_ROLES.ADMIN,
    department: 'Administration',
    bio: '',
    skills: [],
    stats: {}
  },
  [USER_ROLES.DIRECTOR]: {
    role: USER_ROLES.DIRECTOR,
    department: 'Leadership',
    bio: '',
    skills: [],
    stats: {}
  },
  [USER_ROLES.CONTENT_DIRECTOR]: {
    role: USER_ROLES.CONTENT_DIRECTOR,
    department: 'Content & Creative',
    bio: '',
    skills: [],
    stats: {}
  },
  [USER_ROLES.SOCIAL_MEDIA_MANAGER]: {
    role: USER_ROLES.SOCIAL_MEDIA_MANAGER,
    department: 'Social Media',
    bio: '',
    skills: [],
    stats: {}
  },
  [USER_ROLES.GRAPHIC_DESIGNER]: {
    role: USER_ROLES.GRAPHIC_DESIGNER,
    department: 'Design',
    bio: '',
    skills: [],
    stats: {}
  },
  [USER_ROLES.HR_MANAGER]: {
    role: USER_ROLES.HR_MANAGER,
    department: 'Human Resources',
    bio: '',
    skills: [],
    stats: {}
  },
  [USER_ROLES.SALES_MANAGER]: {
    role: USER_ROLES.SALES_MANAGER,
    department: 'Sales',
    bio: '',
    skills: [],
    stats: {}
  }
};

// Legacy export for backwards compatibility
export const MOCK_USERS = DEFAULT_USER_BY_ROLE;

// Helper function to get role permissions
export function getRolePermissions(role) {
  if (ROLE_PERMISSIONS[role]) {
    return ROLE_PERMISSIONS[role];
  } else {
    console.warn('⚠️ Role not found in ROLE_PERMISSIONS, falling back to CONTENT_DIRECTOR');
    return ROLE_PERMISSIONS[USER_ROLES.CONTENT_DIRECTOR];
  }
}

// Helper function to check if user has permission
export function hasPermission(userRole, permission) {
  const permissions = getRolePermissions(userRole);
  return permissions.permissions[permission] || false;
}

// Helper function to get user by role
export function getUserByRole(role) {
  if (MOCK_USERS[role]) {
    return MOCK_USERS[role];
  } else {
    console.warn('⚠️ Role not found in MOCK_USERS, falling back to CONTENT_DIRECTOR');
    return MOCK_USERS[USER_ROLES.CONTENT_DIRECTOR];
  }
}

// Helper function to get all available roles
export function getAvailableRoles() {
  return Object.values(USER_ROLES);
}
