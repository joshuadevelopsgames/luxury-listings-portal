import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';

// Parse YYYY-MM-DD or date string to local date for comparison
const parseLocal = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const CalendarView = ({ tasks = [], sentRequests = [], outboxTaskMap = {}, onClose, onTaskClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTasksForDay = (day) => {
    return tasks.filter((task) => {
      if (!task.due_date) return false;
      const taskDate = parseLocal(task.due_date);
      return taskDate && isSameDay(taskDate, day);
    });
  };

  const getOutboxForDay = (day) => {
    return sentRequests.filter((req) => {
      const due = req.taskDueDate ? parseLocal(req.taskDueDate) : null;
      if (!due) return false;
      return isSameDay(due, day);
    });
  };

  const firstDayOfMonth = monthStart.getDay();
  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const taskStyle = (task) => {
    if (task.status === 'completed') return 'bg-positive/20 dark:bg-positive/30 text-positive line-through';
    if (task.priority === 'urgent' || task.priority === 'p1') return 'bg-danger/15 dark:bg-danger/25 text-danger';
    if (task.priority === 'high' || task.priority === 'p2') return 'bg-warning/15 dark:bg-warning/25 text-warning';
    return 'bg-black/10 dark:bg-white/10 text-ink';
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <div className="bg-surface rounded-xl w-full max-w-7xl mb-8 border border-hairline-strong shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-hairline">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-brand" />
            </div>
            <h2 className="text-[20px] font-semibold text-ink">Task Calendar</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-xl overflow-hidden border border-hairline-strong bg-surface-2">
              <button
                type="button"
                onClick={previousMonth}
                className="p-2.5 text-ink hover:bg-surface-3 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[140px] text-center py-2.5 text-[14px] font-semibold text-ink">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2.5 text-ink hover:bg-surface-3 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="px-4 py-2.5 rounded-xl bg-surface-3 text-ink text-[13px] font-medium hover:bg-hairline-strong"
            >
              Today
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center text-ink-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-ink-muted text-[12px] sm:text-[13px] py-2"
              >
                {day}
              </div>
            ))}

            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="aspect-square min-h-[80px] sm:min-h-[100px] rounded-xl bg-surface-2"
              />
            ))}

            {daysInMonth.map((day) => {
              const dayTasks = getTasksForDay(day);
              const dayOutbox = getOutboxForDay(day);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square min-h-[80px] sm:min-h-[100px] p-2 rounded-xl border transition-colors flex flex-col ${
                    isCurrentDay
                      ? 'bg-brand/10 dark:bg-brand/20 border-2 border-brand'
                      : 'bg-surface border-hairline-strong hover:border-hairline-strong'
                  }`}
                >
                  <div
                    className={`text-[13px] font-semibold mb-1 ${
                      isCurrentDay ? 'text-brand' : 'text-ink'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className={`text-[11px] sm:text-xs px-1.5 py-1 rounded-lg cursor-pointer truncate border border-transparent ${taskStyle(task)}`}
                        onClick={() => onTaskClick?.(task)}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayOutbox.slice(0, 2).map((req) => {
                      const task = outboxTaskMap[req.id];
                      const label = task?.title || req.taskTitle || 'Requested';
                      const canOpen = !!task;
                      return (
                        <div
                          key={req.id}
                          role={canOpen ? 'button' : undefined}
                          onClick={canOpen ? () => onTaskClick?.(task) : undefined}
                          className={`text-[11px] sm:text-xs px-1.5 py-1 rounded-lg truncate border border-dashed border-brand/50 dark:border-brand/60 bg-brand/10 dark:bg-brand/15 text-brand ${canOpen ? 'cursor-pointer hover:bg-brand/20 dark:hover:bg-brand/25' : ''}`}
                          title={canOpen ? `Open: ${label}` : `Outbox: ${label}`}
                        >
                          {label}
                        </div>
                      );
                    })}
                    {(dayTasks.length > 3 || dayOutbox.length > 2) && (
                      <div className="text-[11px] text-ink-muted text-center">
                        +{Math.max(0, dayTasks.length - 3) + Math.max(0, dayOutbox.length - 2)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[13px]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-danger/20 dark:bg-danger/30" />
              <span className="text-ink-muted">P1 Urgent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-warning/20 dark:bg-warning/30" />
              <span className="text-ink-muted">P2 High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-positive/20 dark:bg-positive/30" />
              <span className="text-ink-muted">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-brand bg-brand/10" />
              <span className="text-ink-muted">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-dashed border-brand/60 bg-brand/10 dark:bg-brand/15" />
              <span className="text-ink-muted">Outbox / Requested</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CalendarView;
