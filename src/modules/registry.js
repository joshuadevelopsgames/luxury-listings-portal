/**
 * Module Registry
 * 
 * Central configuration for all feature modules in the application.
 * Each module defines its routes, widgets, navigation placement, and whether
 * it's included in the base package or requires upgrade.
 */

import { Calendar, Users, Instagram, CheckSquare, Target, TrendingUp, Wrench, BookOpen, FileText, Briefcase, BarChart3, User, Palette, Bug, MessageSquare, Sparkles } from 'lucide-react';

// ============================================================================
// MODULE DEFINITIONS
// ============================================================================

export const modules = {
  // -------------------------------------------------------------------------
  // BASE MODULES (included for all users)
  // -------------------------------------------------------------------------
  
  'time-off': {
    id: 'time-off',
    name: 'Time Off',
    description: 'Request and manage time off',
    icon: Calendar,
    routes: ['/my-time-off'],
    widgets: ['timeOffSummary'],
    navItem: {
      path: '/my-time-off',
      section: 'Main'
    },
    baseModule: true
  },

  'my-clients': {
    id: 'my-clients',
    name: 'My Clients',
    description: 'View your assigned clients and deliverables',
    icon: Users,
    routes: ['/my-clients'],
    widgets: ['clientOverview', 'deliverablesDue'],
    navItem: {
      path: '/my-clients',
      section: 'SMM'
    },
    baseModule: true
  },

  'instagram-reports': {
    id: 'instagram-reports',
    name: 'Instagram Analytics',
    description: 'Create and share Instagram analytics reports',
    icon: Instagram,
    routes: ['/instagram-reports'],
    widgets: ['recentReports'],
    navItem: {
      path: '/instagram-reports',
      section: 'SMM'
    },
    baseModule: true
  },

  // -------------------------------------------------------------------------
  // UPGRADE MODULES (enabled per user/organization)
  // -------------------------------------------------------------------------

  'tasks': {
    id: 'tasks',
    name: 'Tasks',
    description: 'Task management and tracking',
    icon: CheckSquare,
    routes: ['/tasks'],
    widgets: ['tasksSummary'],
    navItem: {
      path: '/tasks',
      section: 'Main'
    },
    baseModule: false
  },

  'clients': {
    id: 'clients',
    name: 'Client Management',
    description: 'SMM client directory and management',
    icon: User,
    routes: ['/clients'],
    widgets: [],
    navItem: {
      path: '/clients',
      section: 'SMM'
    },
    baseModule: false
  },

  'posting-packages': {
    id: 'posting-packages',
    name: 'Posting Packages',
    description: 'Manage posting packages for @luxury_listings features',
    icon: Briefcase,
    routes: ['/posting-packages'],
    widgets: ['postsLogged'],
    navItem: {
      path: '/posting-packages',
      section: 'Content Team'
    },
    baseModule: false
  },

  'content-calendar': {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Schedule and plan content',
    icon: Calendar,
    routes: ['/content-calendar'],
    widgets: [],
    navItem: {
      path: '/content-calendar',
      section: 'SMM'
    },
    baseModule: false
  },

  'crm': {
    id: 'crm',
    name: 'CRM',
    description: 'Customer relationship management',
    icon: Target,
    routes: ['/crm'],
    widgets: [],
    navItem: {
      path: '/crm',
      section: 'Sales Team'
    },
    baseModule: false
  },

  'team': {
    id: 'team',
    name: 'Team Management',
    description: 'Manage team members and roles',
    icon: Users,
    routes: ['/team'],
    widgets: [],
    navItem: {
      path: '/team',
      section: 'HR'
    },
    baseModule: false
  },

  'hr-calendar': {
    id: 'hr-calendar',
    name: 'HR Calendar',
    description: 'View and approve team time off requests',
    icon: Calendar,
    routes: ['/hr-calendar'],
    widgets: [],
    navItem: {
      path: '/hr-calendar',
      section: 'HR'
    },
    baseModule: false
  },

  'hr-analytics': {
    id: 'hr-analytics',
    name: 'HR Analytics',
    description: 'Team analytics and insights',
    icon: TrendingUp,
    routes: ['/hr-analytics'],
    widgets: [],
    navItem: {
      path: '/hr-analytics',
      section: 'HR'
    },
    baseModule: false
  },

  'it-support': {
    id: 'it-support',
    name: 'IT Support',
    description: 'Submit and track support tickets',
    icon: Wrench,
    routes: ['/it-support'],
    widgets: [],
    navItem: {
      path: '/it-support',
      section: 'Admin'
    },
    baseModule: false
  },

  'tutorials': {
    id: 'tutorials',
    name: 'Tutorials',
    description: 'Learning resources and guides',
    icon: BookOpen,
    routes: ['/tutorials'],
    widgets: [],
    navItem: {
      path: '/tutorials',
      section: 'Resources'
    },
    baseModule: false
  },

  'resources': {
    id: 'resources',
    name: 'Resources',
    description: 'Company resources and documents',
    icon: FileText,
    routes: ['/resources'],
    widgets: [],
    navItem: {
      path: '/resources',
      section: 'Resources'
    },
    baseModule: false
  },

  'features': {
    id: 'features',
    name: 'Features',
    description: 'Future features available to quote',
    icon: Sparkles,
    routes: ['/features'],
    widgets: [],
    navItem: {
      path: '/features',
      section: 'Resources'
    },
    baseModule: false
  },

  'workload': {
    id: 'workload',
    name: 'Team Workload',
    description: 'View team capacity and client distribution',
    icon: BarChart3,
    routes: ['/workload'],
    widgets: [],
    navItem: {
      path: '/workload',
      section: 'HR'
    },
    baseModule: false
  },

  'graphic-projects': {
    id: 'graphic-projects',
    name: 'Team Projects',
    description: 'Track graphic design projects and hours',
    icon: Palette,
    routes: ['/graphic-projects'],
    widgets: [],
    navItem: {
      path: '/graphic-projects',
      section: 'Design Team'
    },
    baseModule: false
  },

  // -------------------------------------------------------------------------
  // ADMIN MODULES (system admin only)
  // -------------------------------------------------------------------------

  'admin-feedback': {
    id: 'admin-feedback',
    name: 'Feedback & Reports',
    description: 'View bug reports and feature requests',
    icon: Bug,
    routes: ['/admin/feedback'],
    widgets: [],
    navItem: {
      path: '/admin/feedback',
      section: 'Admin'
    },
    baseModule: false,
    adminOnly: true
  },

  'admin-chats': {
    id: 'admin-chats',
    name: 'Support Chats',
    description: 'Respond to user support chats',
    icon: MessageSquare,
    routes: ['/admin/chats'],
    widgets: [],
    navItem: {
      path: '/admin/chats',
      section: 'Admin'
    },
    baseModule: false,
    adminOnly: true
  }
};

// ============================================================================
// WIDGET SIZES (Apple-style: small 1x1, medium 2x1, large 2x2)
// ============================================================================

export const WIDGET_DEFAULT_SIZES = {
  timeOffSummary: 'medium',   // 2x1
  clientOverview: 'small',    // 1x1
  deliverablesDue: 'small',   // 1x1
  recentReports: 'medium',   // 2x1
  tasksSummary: 'small',     // 1x1
};

export function getWidgetDefaultSize(widgetId) {
  return WIDGET_DEFAULT_SIZES[widgetId] || 'small';
}

/** Slot cost for row packing: max 4 slots per row; large in row => 3 widgets (large can shrink to 1/3) */
export function getWidgetSlotCount(size) {
  switch (size) {
    case 'medium':
    case 'large':
      return 2;
    default:
      return 1;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all base modules (included for all users)
 */
export function getBaseModules() {
  return Object.values(modules).filter(m => m.baseModule);
}

/**
 * Get all base module IDs
 */
export function getBaseModuleIds() {
  return Object.keys(modules).filter(id => modules[id].baseModule);
}

/**
 * Get ALL module IDs (for system admins)
 */
export function getAllModuleIds() {
  return Object.keys(modules);
}

/**
 * Get module by ID
 */
export function getModule(moduleId) {
  return modules[moduleId] || null;
}

/**
 * Get all widgets for enabled modules (with default size: small | medium | large)
 */
export function getWidgetsForModules(enabledModuleIds) {
  const widgets = [];
  for (const moduleId of enabledModuleIds) {
    const module = modules[moduleId];
    if (module && module.widgets) {
      widgets.push(...module.widgets.map(widgetId => ({
        widgetId,
        moduleId,
        moduleName: module.name,
        size: getWidgetDefaultSize(widgetId)
      })));
    }
  }
  return widgets;
}

/**
 * Get navigation items for enabled modules, grouped by section
 */
export function getNavItemsForModules(enabledModuleIds) {
  const sections = {};
  
  for (const moduleId of enabledModuleIds) {
    const module = modules[moduleId];
    if (module && module.navItem) {
      const section = module.navItem.section;
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push({
        id: moduleId,
        name: module.name,
        icon: module.icon,
        path: module.navItem.path
      });
    }
  }
  
  return sections;
}

/**
 * Check if a route belongs to an enabled module
 */
export function isRouteEnabled(path, enabledModuleIds) {
  for (const moduleId of enabledModuleIds) {
    const module = modules[moduleId];
    if (module && module.routes.some(route => path.startsWith(route))) {
      return true;
    }
  }
  return false;
}

export default modules;
