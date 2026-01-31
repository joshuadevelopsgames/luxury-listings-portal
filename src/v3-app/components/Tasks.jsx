import React, { useState, useEffect } from 'react';
import { Plus, Search, Clock, Star, MoreHorizontal, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DailyTask } from '../../entities/DailyTask';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

/**
 * V3 Tasks - Real Data from Firestore
 */
const V3Tasks = () => {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const toggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    
    try {
      await DailyTask.update(taskId, { 
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString() : null
      });
      // Update local state
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const toggleStar = async (taskId, e) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStarred = !task.starred;
    
    try {
      await DailyTask.update(taskId, { starred: newStarred });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, starred: newStarred } : t));
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // Format due date display
  const formatDueDate = (dueDate) => {
    if (!dueDate) return 'No date';
    try {
      const date = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      if (isPast(date)) return 'Overdue';
      return format(date, 'MMM d');
    } catch {
      return 'No date';
    }
  };

  // Filter and search tasks
  const filteredTasks = tasks.filter(task => {
    // Apply filter
    if (filter === 'completed' && task.status !== 'completed') return false;
    if (filter === 'pending' && task.status === 'completed') return false;
    if (filter === 'starred' && !task.starred) return false;
    
    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        task.title?.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search) ||
        task.category?.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status !== 'completed').length,
  };

  const priorityStyles = {
    high: 'bg-[#ff3b30]/10 text-[#ff3b30]',
    urgent: 'bg-[#ff3b30]/10 text-[#ff3b30]',
    medium: 'bg-[#ff9500]/10 text-[#ff9500]',
    low: 'bg-[#34c759]/10 text-[#34c759]',
  };

  const categoryColors = {
    'Review': 'from-[#0071e3] to-[#5856d6]',
    'Content': 'from-[#af52de] to-[#ff2d55]',
    'Design': 'from-[#ff9500] to-[#ff3b30]',
    'Meeting': 'from-[#34c759] to-[#30d158]',
    'Analytics': 'from-[#5856d6] to-[#0071e3]',
    'Admin': 'from-[#86868b] to-[#636366]',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Tasks</h1>
          <p className="text-[17px] text-[#86868b]">Manage your tasks and stay organized.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadTasks}
            className="h-10 px-4 rounded-full bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
            Refresh
          </button>
          <button className="flex items-center gap-2 h-10 px-5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Completed', value: stats.completed, color: 'text-[#34c759]' },
          { label: 'Pending', value: stats.pending, color: 'text-[#ff9500]' },
        ].map((stat, idx) => (
          <div key={idx} className="p-4 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
            <p className={`text-[28px] font-semibold tracking-[-0.02em] ${stat.color || 'text-[#1d1d1f] dark:text-white'}`}>{stat.value}</p>
            <p className="text-[13px] text-[#86868b]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-black/5 dark:bg-white/5 border-0 text-[13px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-lg">
          {['all', 'pending', 'completed', 'starred'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-[13px] font-medium capitalize transition-all ${
                filter === f
                  ? 'bg-white dark:bg-[#3d3d3d] text-[#1d1d1f] dark:text-white shadow-sm'
                  : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="p-12 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#86868b]" />
          </div>
          <p className="text-[17px] font-medium text-[#1d1d1f] dark:text-white mb-1">
            {searchTerm || filter !== 'all' ? 'No tasks found' : 'No tasks yet'}
          </p>
          <p className="text-[13px] text-[#86868b]">
            {searchTerm || filter !== 'all' ? 'Try adjusting your filters' : 'Create a task to get started'}
          </p>
        </div>
      )}

      {/* Task List */}
      {filteredTasks.length > 0 && (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const dueDateDisplay = formatDueDate(task.due_date);
            const isOverdue = dueDateDisplay === 'Overdue';
            
            return (
              <div
                key={task.id}
                className="p-5 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isCompleted ? 'bg-[#34c759] border-[#34c759]' : 'border-[#d1d1d6] hover:border-[#0071e3]'
                    }`}
                  >
                    {isCompleted && (
                      <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className={`text-[15px] font-medium mb-1 ${isCompleted ? 'text-[#86868b] line-through' : 'text-[#1d1d1f] dark:text-white'}`}>
                      {task.title || task.name || 'Untitled Task'}
                    </h3>
                    {task.description && (
                      <p className="text-[13px] text-[#86868b] mb-3">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      {task.category && (
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold text-white bg-gradient-to-r ${categoryColors[task.category] || categoryColors['Admin']}`}>
                          {task.category}
                        </span>
                      )}
                      {task.priority && (
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide ${priorityStyles[task.priority?.toLowerCase()] || priorityStyles['medium']}`}>
                          {task.priority}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-[12px] ${isOverdue ? 'text-[#ff3b30]' : 'text-[#86868b]'}`}>
                        <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {dueDateDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => toggleStar(task.id, e)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        task.starred ? 'text-[#ff9500]' : 'text-[#86868b] hover:text-[#ff9500]'
                      }`}
                    >
                      <Star className={`w-[18px] h-[18px] ${task.starred ? 'fill-current' : ''}`} strokeWidth={1.5} />
                    </button>
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default V3Tasks;
