import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DailyTask } from '../../entities/DailyTask';
import { format, parseISO, isToday, isSameDay } from 'date-fns';

/**
 * V3 Calendar - Real Data from Tasks
 */
const V3Calendar = () => {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load tasks from Firestore
  useEffect(() => {
    loadTasks();
  }, [currentUser?.email]);

  const loadTasks = async () => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const tasksData = await DailyTask.filter({ assigned_to: currentUser.email }, '-due_date');
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Get events for selected date
  const getEventsForDate = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      try {
        const taskDate = typeof task.due_date === 'string' 
          ? parseISO(task.due_date) 
          : task.due_date.toDate ? task.due_date.toDate() : new Date(task.due_date);
        return isSameDay(taskDate, date);
      } catch {
        return false;
      }
    });
  };

  // Check if date has events
  const hasEvents = (day) => {
    if (!day) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return getEventsForDate(date).length > 0;
  };

  const selectedEvents = getEventsForDate(selectedDate);
  const todaysEvents = getEventsForDate(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isTodayCheck = (day) => {
    const today = new Date();
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  const isSelected = (day) => {
    return day === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth() && currentDate.getFullYear() === selectedDate.getFullYear();
  };

  // Event colors based on priority
  const getEventColor = (task) => {
    switch (task.priority?.toLowerCase()) {
      case 'high':
      case 'urgent': return 'bg-danger';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-positive';
      default: return 'bg-brand';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-ink tracking-[-0.02em] mb-1">Calendar</h1>
          <p className="text-[17px] text-ink-muted">View your scheduled tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadTasks}
            className="h-10 px-4 rounded-full bg-surface-3 text-[13px] font-medium text-ink hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
            Refresh
          </button>
          <button className="flex items-center gap-2 h-10 px-5 rounded-full bg-brand text-white text-[13px] font-medium shadow-lg shadow-brand/25 hover:bg-brand-hover active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Task
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-semibold text-ink tracking-[-0.02em]">
              {monthName} {year}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-3 transition-colors">
                <ChevronLeft className="w-5 h-5 text-ink" strokeWidth={1.5} />
              </button>
              <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }} className="px-4 py-1.5 rounded-lg text-[13px] font-medium text-brand hover:bg-brand/10 transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-3 transition-colors">
                <ChevronRight className="w-5 h-5 text-ink" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2 text-center text-[12px] font-semibold text-ink-muted uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => (
              <button
                key={idx}
                onClick={() => day && setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                disabled={!day}
                className={`
                  aspect-square p-2 rounded-xl text-[15px] font-medium relative
                  transition-all duration-200
                  ${!day ? 'invisible' : ''}
                  ${isTodayCheck(day) ? 'bg-brand text-white shadow-lg shadow-brand/30' : ''}
                  ${isSelected(day) && !isTodayCheck(day) ? 'bg-brand/10 text-brand' : ''}
                  ${!isTodayCheck(day) && !isSelected(day) && day ? 'text-ink hover:bg-surface-3' : ''}
                `}
              >
                {day}
                {hasEvents(day) && !isTodayCheck(day) && (
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Events Sidebar */}
        <div className="rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="p-5 border-b border-black/5 dark:border-white/5">
            <h3 className="text-[17px] font-semibold text-ink">
              {isSameDay(selectedDate, new Date()) ? "Today's Tasks" : format(selectedDate, 'MMM d, yyyy')}
            </h3>
            <p className="text-[13px] text-ink-muted">{selectedEvents.length} task{selectedEvents.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedEvents.length > 0 ? (
              selectedEvents.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-1 self-stretch rounded-full ${getEventColor(task)}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-medium text-ink mb-1 truncate">
                        {task.title || task.name || 'Untitled Task'}
                      </h4>
                      <div className="flex items-center gap-2 text-[12px] text-ink-muted">
                        <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>{task.priority || 'Normal'} priority</span>
                        {task.category && (
                          <>
                            <span>•</span>
                            <span>{task.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <CalendarIcon className="w-10 h-10 text-ink-muted mx-auto mb-2" />
                <p className="text-[13px] text-ink-muted">No tasks for this date</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-black/5 dark:border-white/5">
            <button className="w-full h-10 rounded-xl border-2 border-dashed border-hairline-strong text-[13px] font-medium text-ink-muted hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" strokeWidth={2} />
              Add Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3Calendar;
