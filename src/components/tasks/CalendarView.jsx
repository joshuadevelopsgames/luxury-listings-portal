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
    if (task.status === 'completed') return 'bg-[#34c759]/20 dark:bg-[#34c759]/30 text-[#34c759] line-through';
    if (task.priority === 'urgent' || task.priority === 'p1') return 'bg-[#ff3b30]/15 dark:bg-[#ff3b30]/25 text-[#ff3b30]';
    if (task.priority === 'high' || task.priority === 'p2') return 'bg-[#ff9500]/15 dark:bg-[#ff9500]/25 text-[#ff9500]';
    return 'bg-black/10 dark:bg-white/10 text-[#1d1d1f] dark:text-white';
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-7xl mb-8 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5856d6]/10 dark:bg-[#5856d6]/20 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-[#5856d6]" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white">Task Calendar</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/5">
              <button
                type="button"
                onClick={previousMonth}
                className="p-2.5 text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[140px] text-center py-2.5 text-[14px] font-semibold text-[#1d1d1f] dark:text-white">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2.5 text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15"
            >
              Today
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#86868b]"
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
                className="text-center font-semibold text-[#86868b] text-[12px] sm:text-[13px] py-2"
              >
                {day}
              </div>
            ))}

            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="aspect-square min-h-[80px] sm:min-h-[100px] rounded-xl bg-black/[0.02] dark:bg-white/5"
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
                      ? 'bg-[#0071e3]/10 dark:bg-[#0071e3]/20 border-2 border-[#0071e3]'
                      : 'bg-white dark:bg-[#2c2c2e] border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  <div
                    className={`text-[13px] font-semibold mb-1 ${
                      isCurrentDay ? 'text-[#0071e3]' : 'text-[#1d1d1f] dark:text-white'
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
                      return (
                        <div
                          key={req.id}
                          className="text-[11px] sm:text-xs px-1.5 py-1 rounded-lg truncate border border-dashed border-[#5856d6]/50 dark:border-[#5856d6]/60 bg-[#5856d6]/10 dark:bg-[#5856d6]/15 text-[#5856d6]"
                          title={`Outbox: ${label}`}
                        >
                          {label}
                        </div>
                      );
                    })}
                    {(dayTasks.length > 3 || dayOutbox.length > 2) && (
                      <div className="text-[11px] text-[#86868b] text-center">
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
              <div className="w-4 h-4 rounded bg-[#ff3b30]/20 dark:bg-[#ff3b30]/30" />
              <span className="text-[#86868b]">P1 Urgent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#ff9500]/20 dark:bg-[#ff9500]/30" />
              <span className="text-[#86868b]">P2 High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#34c759]/20 dark:bg-[#34c759]/30" />
              <span className="text-[#86868b]">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-[#0071e3] bg-[#0071e3]/10" />
              <span className="text-[#86868b]">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-dashed border-[#5856d6]/60 bg-[#5856d6]/10 dark:bg-[#5856d6]/15" />
              <span className="text-[#86868b]">Outbox / Requested</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CalendarView;
