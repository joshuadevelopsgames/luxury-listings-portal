/**
 * WidgetGrid - Dynamic dashboard widget grid
 * 
 * Renders widgets based on user's enabled modules.
 * Each widget is lazy-loaded and handles its own data fetching.
 */

import React, { Suspense, lazy } from 'react';
import { getWidgetsForModules } from '../../modules/registry';

// Lazy load widget components
const widgetComponents = {
  timeOffSummary: lazy(() => import('../../modules/time-off/widgets/TimeOffSummaryWidget')),
  clientOverview: lazy(() => import('../../modules/my-clients/widgets/ClientOverviewWidget')),
  deliverablesDue: lazy(() => import('../../modules/my-clients/widgets/DeliverablesDueWidget')),
  recentReports: lazy(() => import('../../modules/instagram-reports/widgets/RecentReportsWidget')),
  tasksSummary: lazy(() => import('./TasksSummaryWidget')),
};

// Widget loading skeleton
const WidgetSkeleton = () => (
  <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10 animate-pulse">
    <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
    <div className="space-y-3">
      <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded" />
      <div className="h-4 w-3/4 bg-black/5 dark:bg-white/5 rounded" />
      <div className="h-4 w-1/2 bg-black/5 dark:bg-white/5 rounded" />
    </div>
  </div>
);

// Widget error boundary fallback
const WidgetError = ({ widgetId }) => (
  <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-red-200 dark:border-red-900/30">
    <p className="text-sm text-red-500 dark:text-red-400">
      Failed to load widget: {widgetId}
    </p>
  </div>
);

// Error boundary for individual widgets
class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <WidgetError widgetId={this.props.widgetId} />;
    }
    return this.props.children;
  }
}

/**
 * WidgetGrid Component
 * 
 * @param {string[]} enabledModules - Array of enabled module IDs
 * @param {string} className - Additional CSS classes
 */
const WidgetGrid = ({ enabledModules = [], className = '' }) => {
  // Get all widgets for enabled modules
  const widgets = getWidgetsForModules(enabledModules);

  if (widgets.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-[#86868b] text-sm">
          No widgets available. Enable modules to see dashboard content.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {widgets.map(({ widgetId, moduleId }) => {
        const WidgetComponent = widgetComponents[widgetId];
        
        if (!WidgetComponent) {
          return null;
        }

        return (
          <WidgetErrorBoundary key={`${moduleId}-${widgetId}`} widgetId={widgetId}>
            <Suspense fallback={<WidgetSkeleton />}>
              <WidgetComponent moduleId={moduleId} />
            </Suspense>
          </WidgetErrorBoundary>
        );
      })}
    </div>
  );
};

export default WidgetGrid;
