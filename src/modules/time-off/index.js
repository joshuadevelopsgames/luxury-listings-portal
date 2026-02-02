/**
 * Time Off Module
 * 
 * Provides time-off request and management functionality.
 */

export { default as TimeOffSummaryWidget } from './widgets/TimeOffSummaryWidget';

export const moduleConfig = {
  id: 'time-off',
  name: 'Time Off',
  description: 'Request and manage time off',
  baseModule: true
};
