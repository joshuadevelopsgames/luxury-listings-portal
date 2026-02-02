/**
 * Instagram Reports Module
 * 
 * Provides Instagram analytics report creation and sharing.
 */

export { default as RecentReportsWidget } from './widgets/RecentReportsWidget';

export const moduleConfig = {
  id: 'instagram-reports',
  name: 'Instagram Reports',
  description: 'Create and share Instagram analytics reports',
  baseModule: true
};
