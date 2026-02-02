/**
 * Instagram Analytics Module
 * 
 * Provides Instagram analytics report creation and sharing.
 */

export { default as RecentReportsWidget } from './widgets/RecentReportsWidget';

export const moduleConfig = {
  id: 'instagram-reports',
  name: 'Instagram Analytics',
  description: 'Create and share Instagram analytics reports',
  baseModule: true
};
