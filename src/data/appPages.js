import {
  Home, CheckSquare, Users, Package, Instagram, Calendar,
  Briefcase, CalendarDays, Wrench, Palmtree, User,
} from 'lucide-react';

/**
 * The pages that can be granted or revoked in permissions screens.
 *
 * This list was duplicated in UserManagement and PermissionsManagement, each
 * with its own emoji per page. `Icon` is a Lucide component so the two
 * screens render the same monochrome iconography as the rest of the app.
 *
 * Note this is app-owned iconography. Custom *role* icons are a separate,
 * admin-typed emoji field and are deliberately left as-is.
 */
export const AVAILABLE_PAGES = [
  { id: 'dashboard',          name: 'Dashboard',          Icon: Home,         category: 'Core' },
  { id: 'tasks',              name: 'Tasks',              Icon: CheckSquare,  category: 'Core' },
  { id: 'clients',            name: 'Client Management',  Icon: Users,        category: 'Client Management' },
  { id: 'posting-packages',   name: 'Posting Packages',   Icon: Package,      category: 'Content' },
  { id: 'instagram-reports',  name: 'Instagram Analytics', Icon: Instagram,   category: 'Client Management' },
  { id: 'content-calendar',   name: 'Content Calendar',   Icon: Calendar,     category: 'Content' },
  { id: 'crm',                name: 'CRM',                Icon: Briefcase,    category: 'Sales' },
  { id: 'hr-calendar',        name: 'HR Calendar',        Icon: CalendarDays, category: 'HR' },
  { id: 'team',               name: 'Team Management',    Icon: Users,        category: 'HR' },
  { id: 'it-support',         name: 'IT Support',         Icon: Wrench,       category: 'Support' },
  { id: 'my-time-off',        name: 'My Time Off',        Icon: Palmtree,     category: 'HR' },
  { id: 'user-management',    name: 'User Management',    Icon: User,         category: 'Admin' },
];

export default AVAILABLE_PAGES;
