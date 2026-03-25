/**
 * Unified Capabilities System
 *
 * This replaces the old split between PERMISSIONS (Permissions.js),
 * FEATURE_PERMISSIONS (PermissionsContext.js), and customPermissions.
 *
 * Two concepts:
 *   1. PAGE ACCESS  — which sidebar pages can a user see?
 *      Checked via usePermissions().hasPageAccess(pageId)
 *
 *   2. CAPABILITIES — what actions can a user take?
 *      Checked via usePermissions().hasCapability(capabilityId)
 *
 * System admins bypass all checks automatically.
 * Roles are display-only and do NOT grant capabilities.
 */

// ============================================================================
// CAPABILITIES — granular action permissions
// ============================================================================
// Merged from the old PERMISSIONS + FEATURE_PERMISSIONS. One flat namespace.

export const CAPABILITIES = {
  // ── User Management ──
  MANAGE_USERS: 'manage_users',
  APPROVE_USERS: 'approve_users',
  ASSIGN_ROLES: 'assign_roles',
  DELETE_USERS: 'delete_users',
  VIEW_ALL_USERS: 'view_all_users',

  // ── Profile Management ──
  EDIT_OWN_NAME: 'edit_own_name',
  EDIT_OWN_DEPARTMENT: 'edit_own_department',
  EDIT_ANY_NAME: 'edit_any_name',
  EDIT_ANY_PROFILE: 'edit_any_profile',
  MANAGE_EMPLOYEE_PROFILES: 'manage_employee_profiles',

  // ── Content Management ──
  MANAGE_POSTING_PACKAGES: 'manage_posting_packages',
  CREATE_CONTENT: 'create_content',
  DELETE_CONTENT: 'delete_content',
  APPROVE_CONTENT: 'approve_content',

  // ── Calendar & Events ──
  MANAGE_CALENDAR: 'manage_calendar',
  VIEW_TEAM_CALENDAR: 'view_team_calendar',
  CREATE_EVENTS: 'create_events',

  // ── Tasks ──
  CREATE_TASKS: 'create_tasks',
  ASSIGN_TASKS: 'assign_tasks',
  VIEW_ALL_TASKS: 'view_all_tasks',
  DELETE_ANY_TASK: 'delete_any_task',
  EDIT_TASK_TEMPLATES: 'edit_task_templates',

  // ── HR Functions ──
  MANAGE_LEAVE_REQUESTS: 'manage_leave_requests',
  APPROVE_LEAVE: 'approve_leave',
  APPROVE_TIME_OFF: 'approve_time_off',
  VIEW_HR_DATA: 'view_hr_data',
  VIEW_ALL_TIME_OFF: 'view_all_time_off',
  MANAGE_TEAM: 'manage_team',

  // ── Client Management ──
  VIEW_ALL_CLIENTS: 'view_all_clients',
  MANAGE_CLIENTS: 'manage_clients',
  MANAGE_ALL_CLIENTS: 'manage_all_clients',
  DELETE_CLIENTS: 'delete_clients',
  ASSIGN_CLIENT_MANAGERS: 'assign_client_managers',
  EDIT_CLIENT_PACKAGES: 'edit_client_packages',

  // ── CRM & Sales ──
  MANAGE_CRM: 'manage_crm',
  VIEW_LEADS: 'view_leads',
  MANAGE_LEADS: 'manage_leads',
  VIEW_SALES_PIPELINE: 'view_sales_pipeline',

  // ── Analytics & Financials ──
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_ANALYTICS: 'export_analytics',
  VIEW_FINANCIALS: 'view_financials',
  VIEW_AUDIT_TRAIL: 'view_audit_trail',

  // ── Instagram Reports ──
  VIEW_ALL_REPORTS: 'view_all_reports',
  MANAGE_INSTAGRAM_REPORTS: 'manage_instagram_reports',

  // ── Resources & Training ──
  MANAGE_TUTORIALS: 'manage_tutorials',
  CREATE_TUTORIALS: 'create_tutorials',
  DELETE_TUTORIALS: 'delete_tutorials',
  MANAGE_RESOURCES: 'manage_resources',

  // ── Projects ──
  MANAGE_GRAPHIC_PROJECTS: 'manage_graphic_projects',
  MANAGE_WORKLOAD: 'manage_workload',

  // ── Communication ──
  MANAGE_CHATS: 'manage_chats',
  MANAGE_FEEDBACK: 'manage_feedback',

  // ── System ──
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_SYSTEM_LOGS: 'view_system_logs',
  MANAGE_SETTINGS: 'manage_settings',
  HANDLE_IT_SUPPORT: 'handle_it_support',
  VIEW_ALL_MODULES: 'view_all_modules',
};

// ============================================================================
// CAPABILITY CATEGORIES — for the admin UI
// ============================================================================

export const CAPABILITY_CATEGORIES = {
  USER_MANAGEMENT: {
    name: 'User Management',
    description: 'Control user accounts and access',
    capabilities: [
      CAPABILITIES.MANAGE_USERS,
      CAPABILITIES.APPROVE_USERS,
      CAPABILITIES.ASSIGN_ROLES,
      CAPABILITIES.DELETE_USERS,
      CAPABILITIES.VIEW_ALL_USERS,
    ],
  },
  PROFILE_MANAGEMENT: {
    name: 'Profile Management',
    description: 'Edit user profiles and information',
    capabilities: [
      CAPABILITIES.EDIT_OWN_NAME,
      CAPABILITIES.EDIT_OWN_DEPARTMENT,
      CAPABILITIES.EDIT_ANY_NAME,
      CAPABILITIES.EDIT_ANY_PROFILE,
      CAPABILITIES.MANAGE_EMPLOYEE_PROFILES,
    ],
  },
  CONTENT_MANAGEMENT: {
    name: 'Content Management',
    description: 'Manage content and posting packages',
    capabilities: [
      CAPABILITIES.MANAGE_POSTING_PACKAGES,
      CAPABILITIES.CREATE_CONTENT,
      CAPABILITIES.DELETE_CONTENT,
      CAPABILITIES.APPROVE_CONTENT,
    ],
  },
  CALENDAR_EVENTS: {
    name: 'Calendar & Events',
    description: 'Manage calendars and events',
    capabilities: [
      CAPABILITIES.MANAGE_CALENDAR,
      CAPABILITIES.VIEW_TEAM_CALENDAR,
      CAPABILITIES.CREATE_EVENTS,
    ],
  },
  TASKS: {
    name: 'Task Management',
    description: 'Create and manage tasks',
    capabilities: [
      CAPABILITIES.CREATE_TASKS,
      CAPABILITIES.ASSIGN_TASKS,
      CAPABILITIES.VIEW_ALL_TASKS,
      CAPABILITIES.DELETE_ANY_TASK,
      CAPABILITIES.EDIT_TASK_TEMPLATES,
    ],
  },
  HR_FUNCTIONS: {
    name: 'HR Functions',
    description: 'Human resources and team management',
    capabilities: [
      CAPABILITIES.MANAGE_LEAVE_REQUESTS,
      CAPABILITIES.APPROVE_LEAVE,
      CAPABILITIES.APPROVE_TIME_OFF,
      CAPABILITIES.VIEW_HR_DATA,
      CAPABILITIES.VIEW_ALL_TIME_OFF,
      CAPABILITIES.MANAGE_TEAM,
    ],
  },
  CLIENT_MANAGEMENT: {
    name: 'Client Management',
    description: 'Manage SMM client profiles and assignments',
    capabilities: [
      CAPABILITIES.VIEW_ALL_CLIENTS,
      CAPABILITIES.MANAGE_CLIENTS,
      CAPABILITIES.MANAGE_ALL_CLIENTS,
      CAPABILITIES.DELETE_CLIENTS,
      CAPABILITIES.ASSIGN_CLIENT_MANAGERS,
      CAPABILITIES.EDIT_CLIENT_PACKAGES,
    ],
  },
  CRM_SALES: {
    name: 'CRM & Sales',
    description: 'Customer relationship and sales management',
    capabilities: [
      CAPABILITIES.MANAGE_CRM,
      CAPABILITIES.VIEW_LEADS,
      CAPABILITIES.MANAGE_LEADS,
      CAPABILITIES.VIEW_SALES_PIPELINE,
    ],
  },
  ANALYTICS: {
    name: 'Analytics & Financials',
    description: 'View and export analytics data',
    capabilities: [
      CAPABILITIES.VIEW_ANALYTICS,
      CAPABILITIES.EXPORT_ANALYTICS,
      CAPABILITIES.VIEW_FINANCIALS,
      CAPABILITIES.VIEW_AUDIT_TRAIL,
    ],
  },
  REPORTS: {
    name: 'Reports',
    description: 'Instagram and client reports',
    capabilities: [
      CAPABILITIES.VIEW_ALL_REPORTS,
      CAPABILITIES.MANAGE_INSTAGRAM_REPORTS,
    ],
  },
  RESOURCES: {
    name: 'Resources & Training',
    description: 'Manage tutorials and resources',
    capabilities: [
      CAPABILITIES.MANAGE_TUTORIALS,
      CAPABILITIES.CREATE_TUTORIALS,
      CAPABILITIES.DELETE_TUTORIALS,
      CAPABILITIES.MANAGE_RESOURCES,
    ],
  },
  PROJECTS: {
    name: 'Projects & Workload',
    description: 'Manage graphic projects and team workload',
    capabilities: [
      CAPABILITIES.MANAGE_GRAPHIC_PROJECTS,
      CAPABILITIES.MANAGE_WORKLOAD,
    ],
  },
  SYSTEM: {
    name: 'System Administration',
    description: 'System-level settings and support',
    capabilities: [
      CAPABILITIES.MANAGE_INTEGRATIONS,
      CAPABILITIES.VIEW_SYSTEM_LOGS,
      CAPABILITIES.MANAGE_SETTINGS,
      CAPABILITIES.HANDLE_IT_SUPPORT,
      CAPABILITIES.VIEW_ALL_MODULES,
    ],
  },
};

// ============================================================================
// LABELS — human-readable names for the admin UI
// ============================================================================

export const CAPABILITY_LABELS = {
  [CAPABILITIES.MANAGE_USERS]: 'Manage Users',
  [CAPABILITIES.APPROVE_USERS]: 'Approve New Users',
  [CAPABILITIES.ASSIGN_ROLES]: 'Assign Roles',
  [CAPABILITIES.DELETE_USERS]: 'Delete Users',
  [CAPABILITIES.VIEW_ALL_USERS]: 'View All Users',
  [CAPABILITIES.EDIT_OWN_NAME]: 'Edit Own First/Last Name',
  [CAPABILITIES.EDIT_OWN_DEPARTMENT]: 'Edit Own Department',
  [CAPABILITIES.EDIT_ANY_NAME]: "Edit Any User's Name",
  [CAPABILITIES.EDIT_ANY_PROFILE]: "Edit Any User's Profile",
  [CAPABILITIES.MANAGE_EMPLOYEE_PROFILES]: 'Manage Employee Profiles',
  [CAPABILITIES.MANAGE_POSTING_PACKAGES]: 'Manage Posting Packages',
  [CAPABILITIES.CREATE_CONTENT]: 'Create Content',
  [CAPABILITIES.DELETE_CONTENT]: 'Delete Content',
  [CAPABILITIES.APPROVE_CONTENT]: 'Approve Content',
  [CAPABILITIES.MANAGE_CALENDAR]: 'Manage Calendar',
  [CAPABILITIES.VIEW_TEAM_CALENDAR]: 'View Team Calendar',
  [CAPABILITIES.CREATE_EVENTS]: 'Create Events',
  [CAPABILITIES.CREATE_TASKS]: 'Create Tasks',
  [CAPABILITIES.ASSIGN_TASKS]: 'Assign Tasks to Others',
  [CAPABILITIES.VIEW_ALL_TASKS]: 'View All Tasks',
  [CAPABILITIES.DELETE_ANY_TASK]: 'Delete Any Task',
  [CAPABILITIES.EDIT_TASK_TEMPLATES]: 'Edit Task Templates',
  [CAPABILITIES.MANAGE_LEAVE_REQUESTS]: 'Manage Leave Requests',
  [CAPABILITIES.APPROVE_LEAVE]: 'Approve Leave Requests',
  [CAPABILITIES.APPROVE_TIME_OFF]: 'Approve Time Off',
  [CAPABILITIES.VIEW_HR_DATA]: 'View HR Data',
  [CAPABILITIES.VIEW_ALL_TIME_OFF]: 'View All Time Off',
  [CAPABILITIES.MANAGE_TEAM]: 'Manage Team',
  [CAPABILITIES.VIEW_ALL_CLIENTS]: 'View All Clients',
  [CAPABILITIES.MANAGE_CLIENTS]: 'Manage Clients',
  [CAPABILITIES.MANAGE_ALL_CLIENTS]: 'Manage All Clients',
  [CAPABILITIES.DELETE_CLIENTS]: 'Delete Clients',
  [CAPABILITIES.ASSIGN_CLIENT_MANAGERS]: 'Assign Client Managers',
  [CAPABILITIES.EDIT_CLIENT_PACKAGES]: 'Edit Client Packages',
  [CAPABILITIES.MANAGE_CRM]: 'Manage CRM',
  [CAPABILITIES.VIEW_LEADS]: 'View Leads',
  [CAPABILITIES.MANAGE_LEADS]: 'Manage Leads',
  [CAPABILITIES.VIEW_SALES_PIPELINE]: 'View Sales Pipeline',
  [CAPABILITIES.VIEW_ANALYTICS]: 'View Analytics',
  [CAPABILITIES.EXPORT_ANALYTICS]: 'Export Analytics Data',
  [CAPABILITIES.VIEW_FINANCIALS]: 'View Financial Data',
  [CAPABILITIES.VIEW_AUDIT_TRAIL]: 'View Audit Trail',
  [CAPABILITIES.VIEW_ALL_REPORTS]: 'View All Reports',
  [CAPABILITIES.MANAGE_INSTAGRAM_REPORTS]: 'Manage Instagram Reports',
  [CAPABILITIES.MANAGE_TUTORIALS]: 'Manage Tutorials',
  [CAPABILITIES.CREATE_TUTORIALS]: 'Create Tutorials',
  [CAPABILITIES.DELETE_TUTORIALS]: 'Delete Tutorials',
  [CAPABILITIES.MANAGE_RESOURCES]: 'Manage Resources',
  [CAPABILITIES.MANAGE_GRAPHIC_PROJECTS]: 'Manage Graphic Projects',
  [CAPABILITIES.MANAGE_WORKLOAD]: 'Manage Workload',
  [CAPABILITIES.MANAGE_CHATS]: 'Manage Chats',
  [CAPABILITIES.MANAGE_FEEDBACK]: 'Manage Feedback',
  [CAPABILITIES.MANAGE_INTEGRATIONS]: 'Manage Integrations',
  [CAPABILITIES.VIEW_SYSTEM_LOGS]: 'View System Logs',
  [CAPABILITIES.MANAGE_SETTINGS]: 'Manage Settings',
  [CAPABILITIES.HANDLE_IT_SUPPORT]: 'Handle IT Support Tickets',
  [CAPABILITIES.VIEW_ALL_MODULES]: 'View All Modules',
};

// ============================================================================
// BACKWARDS COMPATIBILITY — re-export old names so existing imports don't break
// ============================================================================

/** @deprecated Use CAPABILITIES instead */
export const PERMISSIONS = CAPABILITIES;
/** @deprecated Use CAPABILITY_CATEGORIES instead */
export const PERMISSION_CATEGORIES = Object.fromEntries(
  Object.entries(CAPABILITY_CATEGORIES).map(([k, v]) => [k, { ...v, permissions: v.capabilities }])
);
/** @deprecated Use CAPABILITY_LABELS instead */
export const PERMISSION_LABELS = CAPABILITY_LABELS;

/** @deprecated Use CAPABILITY_LABELS[cap] instead */
export function getPermissionDescription(cap) {
  return CAPABILITY_LABELS[cap] || '';
}
