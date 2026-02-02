/**
 * WidgetGrid - Dynamic dashboard widget grid
 *
 * Renders widgets based on user's enabled modules.
 * Optional: widgetOrder (array of widgetIds) for custom order; isEditMode + onWidgetOrderChange for drag-and-drop.
 */

import React, { Suspense, lazy, useMemo } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
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

function SortableWidgetCell({ widgetId, moduleId, isEditMode, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50 z-10' : ''}>
      <div className="relative">
        {isEditMode && (
          <div
            className="absolute left-2 top-2 z-20 w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="w-4 h-4 text-[#86868b]" />
          </div>
        )}
        <div className={isEditMode ? 'pl-10' : ''}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * WidgetGrid Component
 *
 * @param {string[]} enabledModules - Array of enabled module IDs
 * @param {string[]} widgetOrder - Optional array of widgetIds for custom order (saved from Edit Dashboard)
 * @param {boolean} isEditMode - Show drag handles and allow reorder
 * @param {function} onWidgetOrderChange - Callback (newOrder: string[]) when order changes
 * @param {string} className - Additional CSS classes
 */
const WidgetGrid = ({ enabledModules = [], widgetOrder = null, isEditMode = false, onWidgetOrderChange, className = '' }) => {
  const rawWidgets = getWidgetsForModules(enabledModules);
  const widgets = useMemo(() => {
    if (!widgetOrder?.length) return rawWidgets;
    const orderMap = new Map(widgetOrder.map((id, i) => [id, i]));
    return [...rawWidgets].sort((a, b) => {
      const ia = orderMap.has(a.widgetId) ? orderMap.get(a.widgetId) : 9999;
      const ib = orderMap.has(b.widgetId) ? orderMap.get(b.widgetId) : 9999;
      return ia - ib;
    });
  }, [rawWidgets, widgetOrder]);

  if (widgets.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-[#86868b] text-sm">
          No widgets available. Enable modules to see dashboard content.
        </p>
      </div>
    );
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onWidgetOrderChange) return;
    const ids = widgets.map((w) => w.widgetId);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onWidgetOrderChange(arrayMove(ids, oldIndex, newIndex));
  };

  const gridContent = (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {widgets.map(({ widgetId, moduleId }) => {
        const WidgetComponent = widgetComponents[widgetId];
        if (!WidgetComponent) return null;
        const cell = (
          <WidgetErrorBoundary key={`${moduleId}-${widgetId}`} widgetId={widgetId}>
            <Suspense fallback={<WidgetSkeleton />}>
              <WidgetComponent moduleId={moduleId} />
            </Suspense>
          </WidgetErrorBoundary>
        );
        return isEditMode ? (
          <SortableWidgetCell key={widgetId} widgetId={widgetId} moduleId={moduleId} isEditMode={isEditMode}>
            {cell}
          </SortableWidgetCell>
        ) : (
          <div key={widgetId}>{cell}</div>
        );
      })}
    </div>
  );

  if (isEditMode && onWidgetOrderChange) {
    return (
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((w) => w.widgetId)} strategy={rectSortingStrategy}>
          {gridContent}
        </SortableContext>
      </DndContext>
    );
  }

  return gridContent;
};

export default WidgetGrid;
