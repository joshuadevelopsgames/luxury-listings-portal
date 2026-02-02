/**
 * WidgetGrid - Dynamic dashboard widget grid
 *
 * Renders widgets based on user's enabled modules.
 * Optional: widgetOrder (array of widgetIds) for custom order; isEditMode + onWidgetOrderChange for drag-and-drop.
 */

import React, { Suspense, lazy, useMemo } from 'react';
import { DndContext, pointerWithin } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getWidgetsForModules, getWidgetSlotCount } from '../../modules/registry';

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

const SLOTS_PER_ROW = 4;

/**
 * Group widgets into rows (max 4 slots per row). When a row has a large widget, that row has 3 columns (large can shrink to 1/3).
 */
function computeRows(widgets) {
  const rows = [];
  let currentRow = [];
  let currentSlots = 0;

  for (const widget of widgets) {
    const slots = getWidgetSlotCount(widget.size);
    if (currentSlots + slots <= SLOTS_PER_ROW) {
      currentRow.push(widget);
      currentSlots += slots;
    } else {
      if (currentRow.length > 0) {
        const hasLarge = currentRow.some((w) => w.size === 'large');
        rows.push({ columnCount: hasLarge ? 3 : 4, widgets: currentRow });
      }
      currentRow = [widget];
      currentSlots = slots;
    }
  }
  if (currentRow.length > 0) {
    const hasLarge = currentRow.some((w) => w.size === 'large');
    rows.push({ columnCount: hasLarge ? 3 : 4, widgets: currentRow });
  }
  return rows;
}

/** Span in row: 3-col row => all span 1 (large shrinks to 1/3); 4-col row => small=1, medium/large=2 */
function getColSpan(columnCount, size) {
  if (columnCount === 3) return 1;
  return size === 'small' ? 1 : 2;
}

function SortableWidgetCell({ widgetId, moduleId, size, columnCount, isEditMode, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId });
  const span = getColSpan(columnCount, size);
  const spanClass = span === 1 ? 'col-span-1' : 'col-span-2';
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${spanClass} min-h-0 ${isDragging ? 'opacity-90 z-[100] scale-[0.98] shadow-lg' : ''} ${isEditMode ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
    >
      <div className="h-full min-h-0 flex flex-col overflow-auto">
        {children}
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

  const rows = useMemo(() => computeRows(widgets), [widgets]);

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
    <div className={`space-y-6 ${className}`}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={`grid gap-6 items-stretch h-[220px] ${row.columnCount === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}
        >
          {row.widgets.map(({ widgetId, moduleId, size }) => {
            const WidgetComponent = widgetComponents[widgetId];
            if (!WidgetComponent) return null;
            const span = getColSpan(row.columnCount, size);
            const spanClass = span === 1 ? 'col-span-1' : 'col-span-2';
            const cell = (
              <WidgetErrorBoundary key={`${moduleId}-${widgetId}`} widgetId={widgetId}>
                <Suspense fallback={<WidgetSkeleton />}>
                  <WidgetComponent moduleId={moduleId} />
                </Suspense>
              </WidgetErrorBoundary>
            );
            return isEditMode ? (
              <SortableWidgetCell
                key={widgetId}
                widgetId={widgetId}
                moduleId={moduleId}
                size={size}
                columnCount={row.columnCount}
                isEditMode={isEditMode}
              >
                {cell}
              </SortableWidgetCell>
            ) : (
              <div key={widgetId} className={`${spanClass} min-h-0 flex flex-col overflow-auto`}>{cell}</div>
            );
          })}
        </div>
      ))}
    </div>
  );

  if (isEditMode && onWidgetOrderChange) {
    return (
      <DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((w) => w.widgetId)} strategy={rectSortingStrategy}>
          {gridContent}
        </SortableContext>
      </DndContext>
    );
  }

  return gridContent;
};

export default WidgetGrid;
