// Granular Permissions System
// These permissions can be assigned to individual users regardless of role

export const PERMISSIONS = {
  // User Management
  MANAGE_USERS: 'manage_users',
  APPROVE_USERS: 'approve_users',
  ASSIGN_ROLES: 'assign_roles',
  DELETE_USERS: 'delete_users',
  VIEW_ALL_USERS: 'view_all_users',
  
  // Profile Management
  EDIT_OWN_NAME: 'edit_own_name',
  EDIT_OWN_DEPARTMENT: 'edit_own_department',
  EDIT_ANY_NAME: 'edit_any_name',
  EDIT_ANY_PROFILE: 'edit_any_profile',
  
  // Content Management
  MANAGE_POSTING_PACKAGES: 'manage_posting_packages',
  CREATE_CONTENT: 'create_content',
  DELETE_CONTENT: 'delete_content',
  APPROVE_CONTENT: 'approve_content',
  
  // Calendar & Events
  MANAGE_CALENDAR: 'manage_calendar',
  VIEW_TEAM_CALENDAR: 'view_team_calendar',
  CREATE_EVENTS: 'create_events',
  
  // Tasks
  CREATE_TASKS: 'create_tasks',
  ASSIGN_TASKS: 'assign_tasks',
  VIEW_ALL_TASKS: 'view_all_tasks',
  DELETE_ANY_TASK: 'delete_any_task',
  EDIT_TASK_TEMPLATES: 'edit_task_templates',
  
  // HR Functions
  MANAGE_LEAVE_REQUESTS: 'manage_leave_requests',
  APPROVE_LEAVE: 'approve_leave',
  VIEW_HR_DATA: 'view_hr_data',
  VIEW_ALL_TIME_OFF: 'view_all_time_off',
  MANAGE_TEAM: 'manage_team',
  
  // Clients List
  VIEW_ALL_CLIENTS: 'view_all_clients',
  MANAGE_CLIENTS: 'manage_clients',
  DELETE_CLIENTS: 'delete_clients',
  ASSIGN_CLIENT_MANAGERS: 'assign_client_managers',
  EDIT_CLIENT_PACKAGES: 'edit_client_packages',
  
  // CRM & Sales
  MANAGE_CRM: 'manage_crm',
  VIEW_LEADS: 'view_leads',
  MANAGE_LEADS: 'manage_leads',
  VIEW_SALES_PIPELINE: 'view_sales_pipeline',
  
  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_ANALYTICS: 'export_analytics',
  
  // Resources & Training
  MANAGE_TUTORIALS: 'manage_tutorials',
  CREATE_TUTORIALS: 'create_tutorials',
  DELETE_TUTORIALS: 'delete_tutorials',
  
  // System
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_SYSTEM_LOGS: 'view_system_logs',
  MANAGE_SETTINGS: 'manage_settings',
  HANDLE_IT_SUPPORT: 'handle_it_support'
};

export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: {
    name: 'User Management',
    description: 'Control user accounts and access',
    permissions: [
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.APPROVE_USERS,
      PERMISSIONS.ASSIGN_ROLES,
      PERMISSIONS.DELETE_USERS,
      PERMISSIONS.VIEW_ALL_USERS
    ]
  },
  PROFILE_MANAGEMENT: {
    name: 'Profile Management',
    description: 'Edit user profiles and information',
    permissions: [
      PERMISSIONS.EDIT_OWN_NAME,
      PERMISSIONS.EDIT_OWN_DEPARTMENT,
      PERMISSIONS.EDIT_ANY_NAME,
      PERMISSIONS.EDIT_ANY_PROFILE
    ]
  },
  CONTENT_MANAGEMENT: {
    name: 'Content Management',
    description: 'Manage content and posting packages',
    permissions: [
      PERMISSIONS.MANAGE_POSTING_PACKAGES,
      PERMISSIONS.CREATE_CONTENT,
      PERMISSIONS.DELETE_CONTENT,
      PERMISSIONS.APPROVE_CONTENT
    ]
  },
  CALENDAR_EVENTS: {
    name: 'Calendar & Events',
    description: 'Manage calendars and events',
    permissions: [
      PERMISSIONS.MANAGE_CALENDAR,
      PERMISSIONS.VIEW_TEAM_CALENDAR,
      PERMISSIONS.CREATE_EVENTS
    ]
  },
  TASKS: {
    name: 'Task Management',
    description: 'Create and manage tasks',
    permissions: [
      PERMISSIONS.CREATE_TASKS,
      PERMISSIONS.ASSIGN_TASKS,
      PERMISSIONS.VIEW_ALL_TASKS,
      PERMISSIONS.DELETE_ANY_TASK,
      PERMISSIONS.EDIT_TASK_TEMPLATES
    ]
  },
  HR_FUNCTIONS: {
    name: 'HR Functions',
    description: 'Human resources and team management',
    permissions: [
      PERMISSIONS.MANAGE_LEAVE_REQUESTS,
      PERMISSIONS.APPROVE_LEAVE,
      PERMISSIONS.VIEW_HR_DATA,
      PERMISSIONS.VIEW_ALL_TIME_OFF,
      PERMISSIONS.MANAGE_TEAM
    ]
  },
  CLIENT_MANAGEMENT: {
    name: 'Clients List',
    description: 'Manage SMM client profiles and assignments',
    permissions: [
      PERMISSIONS.VIEW_ALL_CLIENTS,
      PERMISSIONS.MANAGE_CLIENTS,
      PERMISSIONS.DELETE_CLIENTS,
      PERMISSIONS.ASSIGN_CLIENT_MANAGERS,
      PERMISSIONS.EDIT_CLIENT_PACKAGES
    ]
  },
  CRM_SALES: {
    name: 'CRM & Sales',
    description: 'Customer relationship and sales management',
    permissions: [
      PERMISSIONS.MANAGE_CRM,
      PERMISSIONS.VIEW_LEADS,
      PERMISSIONS.MANAGE_LEADS,
      PERMISSIONS.VIEW_SALES_PIPELINE
    ]
  },
  ANALYTICS: {
    name: 'Analytics',
    description: 'View and export analytics data',
    permissions: [
      PERMISSIONS.VIEW_ANALYTICS,
      PERMISSIONS.EXPORT_ANALYTICS
    ]
  },
  RESOURCES: {
    name: 'Resources & Training',
    description: 'Manage tutorials and resources',
    permissions: [
      PERMISSIONS.MANAGE_TUTORIALS,
      PERMISSIONS.CREATE_TUTORIALS,
      PERMISSIONS.DELETE_TUTORIALS
    ]
  },
  SYSTEM: {
    name: 'System Administration',
    description: 'System-level settings and support',
    permissions: [
      PERMISSIONS.MANAGE_INTEGRATIONS,
      PERMISSIONS.VIEW_SYSTEM_LOGS,
      PERMISSIONS.MANAGE_SETTINGS,
      PERMISSIONS.HANDLE_IT_SUPPORT
    ]
  }
};

export const PERMISSION_LABELS = {
  [PERMISSIONS.MANAGE_USERS]: 'Manage Users',
  [PERMISSIONS.APPROVE_USERS]: 'Approve New Users',
  [PERMISSIONS.ASSIGN_ROLES]: 'Assign Roles',
  [PERMISSIONS.DELETE_USERS]: 'Delete Users',
  [PERMISSIONS.VIEW_ALL_USERS]: 'View All Users',
  
  [PERMISSIONS.EDIT_OWN_NAME]: 'Edit Own First/Last Name',
  [PERMISSIONS.EDIT_OWN_DEPARTMENT]: 'Edit Own Department',
  [PERMISSIONS.EDIT_ANY_NAME]: 'Edit Any User\'s Name',
  [PERMISSIONS.EDIT_ANY_PROFILE]: 'Edit Any User\'s Profile',
  
  [PERMISSIONS.MANAGE_POSTING_PACKAGES]: 'Manage Posting Packages',
  [PERMISSIONS.CREATE_CONTENT]: 'Create Content',
  [PERMISSIONS.DELETE_CONTENT]: 'Delete Content',
  [PERMISSIONS.APPROVE_CONTENT]: 'Approve Content',
  
  [PERMISSIONS.MANAGE_CALENDAR]: 'Manage Calendar',
  [PERMISSIONS.VIEW_TEAM_CALENDAR]: 'View Team Calendar',
  [PERMISSIONS.CREATE_EVENTS]: 'Create Events',
  
  [PERMISSIONS.CREATE_TASKS]: 'Create Tasks',
  [PERMISSIONS.ASSIGN_TASKS]: 'Assign Tasks to Others',
  [PERMISSIONS.VIEW_ALL_TASKS]: 'View All Tasks',
  [PERMISSIONS.DELETE_ANY_TASK]: 'Delete Any Task',
  [PERMISSIONS.EDIT_TASK_TEMPLATES]: 'Edit Task Templates',
  
  [PERMISSIONS.MANAGE_LEAVE_REQUESTS]: 'Manage Leave Requests',
  [PERMISSIONS.APPROVE_LEAVE]: 'Approve Leave Requests',
  [PERMISSIONS.VIEW_HR_DATA]: 'View HR Data',
  [PERMISSIONS.VIEW_ALL_TIME_OFF]: 'View All Time Off (vacation/sick)',
  [PERMISSIONS.MANAGE_TEAM]: 'Manage Team',
  
  [PERMISSIONS.VIEW_ALL_CLIENTS]: 'View All Clients',
  [PERMISSIONS.MANAGE_CLIENTS]: 'Manage Clients',
  [PERMISSIONS.DELETE_CLIENTS]: 'Delete Clients',
  [PERMISSIONS.ASSIGN_CLIENT_MANAGERS]: 'Assign Client Managers',
  [PERMISSIONS.EDIT_CLIENT_PACKAGES]: 'Edit Client Packages',
  
  [PERMISSIONS.MANAGE_CRM]: 'Manage CRM',
  [PERMISSIONS.VIEW_LEADS]: 'View Leads',
  [PERMISSIONS.MANAGE_LEADS]: 'Manage Leads',
  [PERMISSIONS.VIEW_SALES_PIPELINE]: 'View Sales Pipeline',
  
  [PERMISSIONS.VIEW_ANALYTICS]: 'View Analytics',
  [PERMISSIONS.EXPORT_ANALYTICS]: 'Export Analytics Data',
  
  [PERMISSIONS.MANAGE_TUTORIALS]: 'Manage Tutorials',
  [PERMISSIONS.CREATE_TUTORIALS]: 'Create Tutorials',
  [PERMISSIONS.DELETE_TUTORIALS]: 'Delete Tutorials',
  
  [PERMISSIONS.MANAGE_INTEGRATIONS]: 'Manage Integrations',
  [PERMISSIONS.VIEW_SYSTEM_LOGS]: 'View System Logs',
  [PERMISSIONS.MANAGE_SETTINGS]: 'Manage Settings',
  [PERMISSIONS.HANDLE_IT_SUPPORT]: 'Handle IT Support Tickets'
};

// Helper function to get permission description
export function getPermissionDescription(permission) {
  const descriptions = {
    [PERMISSIONS.MANAGE_USERS]: 'Edit user roles and page permissions (add/remove users is system admin only)',
    [PERMISSIONS.APPROVE_USERS]: 'Approve pending user registrations',
    [PERMISSIONS.ASSIGN_ROLES]: 'Assign and modify user roles',
    [PERMISSIONS.DELETE_USERS]: 'Remove users from the system',
    [PERMISSIONS.VIEW_ALL_USERS]: 'View all user profiles and information',
    
    [PERMISSIONS.EDIT_OWN_NAME]: 'Change their own first and last name',
    [PERMISSIONS.EDIT_OWN_DEPARTMENT]: 'Change their own department',
    [PERMISSIONS.EDIT_ANY_NAME]: 'Change any user\'s first and last name',
    [PERMISSIONS.EDIT_ANY_PROFILE]: 'Edit any user\'s profile information',
    
    [PERMISSIONS.MANAGE_POSTING_PACKAGES]: 'Add, edit, and manage posting packages for @luxury_listings',
    [PERMISSIONS.CREATE_CONTENT]: 'Create new content items',
    [PERMISSIONS.DELETE_CONTENT]: 'Delete content items',
    [PERMISSIONS.APPROVE_CONTENT]: 'Approve content before publishing',
    
    [PERMISSIONS.MANAGE_CALENDAR]: 'Full calendar management access',
    [PERMISSIONS.VIEW_TEAM_CALENDAR]: 'View team calendar and events',
    [PERMISSIONS.CREATE_EVENTS]: 'Create calendar events',
    
    [PERMISSIONS.CREATE_TASKS]: 'Create new tasks',
    [PERMISSIONS.ASSIGN_TASKS]: 'Assign tasks to team members',
    [PERMISSIONS.VIEW_ALL_TASKS]: 'View all team tasks',
    [PERMISSIONS.DELETE_ANY_TASK]: 'Delete any task in the system',
    [PERMISSIONS.EDIT_TASK_TEMPLATES]: 'Create and edit their own task templates and share with others (Tasks UI does not gate on this; kept for role display).',
    
    [PERMISSIONS.MANAGE_LEAVE_REQUESTS]: 'View and manage all leave requests',
    [PERMISSIONS.APPROVE_LEAVE]: 'Approve or reject leave requests',
    [PERMISSIONS.VIEW_HR_DATA]: 'Access HR data and reports',
    [PERMISSIONS.VIEW_ALL_TIME_OFF]: 'See all users\' vacation and sick days (read-only list)',
    [PERMISSIONS.MANAGE_TEAM]: 'Manage team members and structure',
    
    [PERMISSIONS.VIEW_ALL_CLIENTS]: 'View all SMM client profiles',
    [PERMISSIONS.MANAGE_CLIENTS]: 'Edit client information and details',
    [PERMISSIONS.DELETE_CLIENTS]: 'Remove clients from the system',
    [PERMISSIONS.ASSIGN_CLIENT_MANAGERS]: 'Assign social media managers to clients',
    [PERMISSIONS.EDIT_CLIENT_PACKAGES]: 'Edit client package type, posts, and payment status',
    
    [PERMISSIONS.MANAGE_CRM]: 'Full CRM access and management',
    [PERMISSIONS.VIEW_LEADS]: 'View leads and prospects',
    [PERMISSIONS.MANAGE_LEADS]: 'Add, edit, and delete leads',
    [PERMISSIONS.VIEW_SALES_PIPELINE]: 'View sales pipeline and deals',
    
    [PERMISSIONS.VIEW_ANALYTICS]: 'View analytics dashboards',
    [PERMISSIONS.EXPORT_ANALYTICS]: 'Export analytics data and reports',
    
    [PERMISSIONS.MANAGE_TUTORIALS]: 'Full tutorial management',
    [PERMISSIONS.CREATE_TUTORIALS]: 'Create new tutorials',
    [PERMISSIONS.DELETE_TUTORIALS]: 'Delete tutorials',
    
    [PERMISSIONS.MANAGE_INTEGRATIONS]: 'Manage third-party integrations',
    [PERMISSIONS.VIEW_SYSTEM_LOGS]: 'View system logs and activity',
    [PERMISSIONS.MANAGE_SETTINGS]: 'Change system settings',
    [PERMISSIONS.HANDLE_IT_SUPPORT]: 'View and respond to IT support tickets'
  };
  
  return descriptions[permission] || '';
}

