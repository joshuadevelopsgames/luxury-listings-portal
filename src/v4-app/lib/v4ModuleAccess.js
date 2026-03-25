import { getAllModuleIds, getBaseModuleIds } from '../../modules/registry';

const SALES_MODULES = ['crm', 'analytics'];
const SMM_MODULES = [
  'tasks',
  'clients',
  'my-clients',
  'instagram-reports',
  'content-calendar',
  'posting-packages',
  'client-health',
];
const HR_MODULES = [
  'team',
  'workload',
  'time-off',
  'hr-calendar',
  'hr-analytics',
];
const DESIGN_MODULES = ['graphic-projects'];
const OPS_MODULES = ['it-support', 'resources', 'features', 'canvas'];

/**
 * Maps Supabase profiles.role to enabled module IDs (V3 registry keys).
 * Admins get everything; others get base + role-appropriate add-ons.
 */
export function getEnabledModulesForRole(role) {
  const r = (role || 'team_member').toLowerCase();
  const base = getBaseModuleIds();

  if (['admin', 'director'].includes(r)) {
    return getAllModuleIds();
  }

  let extra = [];
  if (r === 'manager') {
    extra = [
      ...SMM_MODULES,
      ...SALES_MODULES,
      ...HR_MODULES,
      ...DESIGN_MODULES,
      ...OPS_MODULES,
    ];
  } else if (r === 'account_manager' || r === 'content_manager') {
    extra = [...SMM_MODULES, 'crm'];
  } else if (r === 'sales_manager') {
    extra = [...SALES_MODULES, 'my-clients', 'clients'];
  } else if (r === 'hr_manager') {
    extra = [...HR_MODULES];
  } else if (r === 'graphic_designer') {
    extra = [...DESIGN_MODULES, 'my-clients', 'content-calendar'];
  } else {
    extra = ['tasks', 'my-clients'];
  }

  return [...new Set([...base, ...extra])];
}

export function isAdminRole(role) {
  return ['admin', 'director', 'manager'].includes((role || '').toLowerCase());
}
