/**
 * My Clients Module
 * 
 * Provides client overview and deliverables tracking for account managers.
 */

export { default as ClientOverviewWidget } from './widgets/ClientOverviewWidget';
export { default as DeliverablesDueWidget } from './widgets/DeliverablesDueWidget';

export const moduleConfig = {
  id: 'my-clients',
  name: 'My Clients',
  description: 'View your assigned clients and deliverables',
  baseModule: true
};
