// User Roles and Permissions System
export const USER_ROLES = {
  ADMIN: 'admin',
  CONTENT_DIRECTOR: 'content_director',
  SOCIAL_MEDIA_MANAGER: 'social_media_manager',
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
    icon: '🎨'
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
  
  [USER_ROLES.HR_MANAGER]: {
    name: 'HR Manager',
    displayName: 'HR Manager',
    description: 'Manages human resources and team development',
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
      'Team Development',
      'Performance Management',
      'HR Analytics',
      'Task Assignment',
      'Resource Access'
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

export const MOCK_USERS = {
  [USER_ROLES.PENDING]: {
    uid: 'pending-001',
    email: 'pending@luxuryrealestate.com',
    displayName: 'Pending User',
    firstName: 'Pending',
    lastName: 'User',
    role: USER_ROLES.PENDING,
    department: 'Pending Approval',
    startDate: new Date().toISOString().split('T')[0],
    avatar: null,
    bio: 'Account pending administrator approval and role assignment.',
    skills: [],
    stats: {}
  },

  [USER_ROLES.ADMIN]: {
    uid: 'admin-001',
    email: 'admin@luxuryrealestate.com',
    displayName: 'System Administrator',
    firstName: 'Admin',
    lastName: 'User',
    role: USER_ROLES.ADMIN,
    department: 'System Administration',
    startDate: '2021-10-13',
    avatar: null,
    bio: 'System administrator with full access to all features and user management capabilities.',
    skills: ['System Administration', 'User Management', 'Role Assignment', 'Security Management', 'System Monitoring'],
    stats: {
      totalUsers: 24,
      activeUsers: 22,
      pendingApprovals: 3,
      systemUptime: '99.9%'
    }
  },
  
  [USER_ROLES.CONTENT_DIRECTOR]: {
    uid: 'content-director-001',
    email: 'joshua.mitchell@luxuryrealestate.com',
    displayName: 'Joshua Mitchell',
    firstName: 'Joshua',
    lastName: 'Mitchell',
    role: USER_ROLES.CONTENT_DIRECTOR,
    department: 'Content & Creative',
    startDate: '2023-01-15',
    avatar: null,
    bio: 'Creative visionary with 8+ years in luxury real estate content strategy. Passionate about storytelling and brand development.',
    skills: ['Content Strategy', 'Creative Direction', 'Team Leadership', 'Brand Development', 'Performance Analytics'],
    stats: {
      tutorialsCreated: 24,
      teamMembers: 8,
      projectsCompleted: 156,
      satisfactionScore: 4.9
    }
  },
  
  [USER_ROLES.SOCIAL_MEDIA_MANAGER]: {
    uid: 'social-manager-001',
    email: 'michelle.chen@luxuryrealestate.com',
    displayName: 'Michelle Chen',
    firstName: 'Michelle',
    lastName: 'Chen',
    role: USER_ROLES.SOCIAL_MEDIA_MANAGER,
    department: 'Social Media & Marketing',
    startDate: '2023-06-20',
    avatar: null,
    bio: 'Social media expert specializing in luxury real estate engagement. Data-driven approach to content optimization.',
    skills: ['Social Media Strategy', 'Content Creation', 'Community Management', 'Analytics', 'Trend Analysis'],
    stats: {
      postsCreated: 342,
      engagementRate: '4.2%',
      followersGrowth: '+28%',
      satisfactionScore: 4.7
    }
  },
  
  [USER_ROLES.HR_MANAGER]: {
    uid: 'hr-manager-001',
    email: 'matthew.rodriguez@luxuryrealestate.com',
    displayName: 'Matthew Rodriguez',
    firstName: 'Matthew',
    lastName: 'Rodriguez',
    role: USER_ROLES.HR_MANAGER,
    department: 'Human Resources',
    startDate: '2022-09-10',
    avatar: null,
    bio: 'HR professional focused on team development and performance optimization. Building strong, productive teams.',
    skills: ['Team Development', 'Performance Management', 'Recruitment', 'Employee Relations', 'HR Analytics'],
    stats: {
      teamMembers: 12,
      retentionRate: '94%',
      satisfactionScore: 4.8,
      trainingPrograms: 8
    }
  },
  
  [USER_ROLES.SALES_MANAGER]: {
    uid: 'sales-manager-001',
    email: 'emily.watson@luxuryrealestate.com',
    displayName: 'Emily Watson',
    firstName: 'Emily',
    lastName: 'Watson',
    role: USER_ROLES.SALES_MANAGER,
    department: 'Sales & Business Development',
    startDate: '2023-03-15',
    avatar: null,
    bio: 'Sales professional with 10+ years in luxury real estate. Expert in client relationship management and sales pipeline optimization.',
    skills: ['CRM Management', 'Lead Generation', 'Sales Strategy', 'Client Relations', 'Pipeline Management', 'Sales Analytics'],
    stats: {
      dealsClosed: 47,
      totalRevenue: '$12.8M',
      conversionRate: '23%',
      satisfactionScore: 4.9
    }
  }
};

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
