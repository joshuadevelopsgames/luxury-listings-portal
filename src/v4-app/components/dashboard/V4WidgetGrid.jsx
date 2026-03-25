import React, { Suspense, lazy, useMemo } from 'react';
import { DndContext, pointerWithin } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getWidgetsForModules, getWidgetSlotCount } from '../../../modules/registry';

const widgetComponents = {
  timeOffSummary: lazy(() => import('./widgets/TimeOffSummaryWidget')),
  clientOverview: lazy(() => import('./widgets/ClientOverviewWidget')),
  deliverablesDue: lazy(() => import('./widgets/DeliverablesDueWidget')),
  recentReports: lazy(() => import('./widgets/RecentReportsWidget')),
  tasksSummary: lazy(() => import('./widgets/TasksSummaryWidget')),
  postsLogged: lazy(() => import('./widgets/PostsLoggedWidget')),
};

const WidgetSkeleton = () => (
  <div className="min-h-[280px] sm:min-h-[327px] bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10 animate-pulse">
    <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
    <div className="space-y-3">
      <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded" />
      <div className="h-4 w-3/4 bg-black/5 dark:bg-white/5 rounded" />
    </div>
  </div>
);

const WidgetError = ({ widgetId }) => (
  <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-red-200 dark:border-red-900/30">
    <p className="text-sm text-red-500 dark:text-red-400">Failed to load widget: {widgetId}</p>
  </div>
);

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
        rows.push({ columnCount: currentRow.length, widgets: currentRow });
      }
      currentRow = [widget];
      currentSlots = slots;
    }
  }
  if (currentRow.length > 0) {
    rows.push({ columnCount: currentRow.length, widgets: currentRow });
  }
  return rows;
}

function SortableWidgetCell({ widgetId, isEditMode, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`col-span-1 min-h-0 min-w-0 ${isDragging ? 'opacity-90 z-[100] scale-[0.98] shadow-lg' : ''} ${isEditMode ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
    >
      {children}
    </div>
  );
}

export default function V4WidgetGrid({
  enabledModules = [],
  widgetOrder = null,
  isEditMode = false,
  onWidgetOrderChange,
  className = '',
}) {
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
    <div className={`w-full space-y-4 sm:space-y-6 ${className}`}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={`grid w-full gap-4 sm:gap-6 grid-cols-1 ${
            row.columnCount === 2 ? 'md:grid-cols-2' : row.columnCount === 3 ? 'md:grid-cols-2 lg:grid-cols-3' : row.columnCount >= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : ''
          }`}
        >
          {row.widgets.map(({ widgetId, moduleId }) => {
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
              <SortableWidgetCell key={widgetId} widgetId={widgetId} isEditMode={isEditMode}>
                {cell}
              </SortableWidgetCell>
            ) : (
              <div key={widgetId} className="col-span-1 min-h-0 min-w-0">
                {cell}
              </div>
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
}
