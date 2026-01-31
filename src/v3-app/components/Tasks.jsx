import React, { useState } from 'react';
import { Plus, Search, Clock, Star, MoreHorizontal, CheckCircle2 } from 'lucide-react';

/**
 * V3 Tasks - Mock Data Demo
 */
const V3Tasks = () => {
  const [filter, setFilter] = useState('all');
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Review client proposals for Oceanview Properties', description: 'Go through the 3 new proposals', category: 'Review', priority: 'high', dueDate: 'Today', completed: false, starred: true },
    { id: 2, title: 'Create social media content calendar', description: 'Plan content for next 2 weeks', category: 'Content', priority: 'medium', dueDate: 'Tomorrow', completed: false, starred: false },
    { id: 3, title: 'Update portfolio images', description: 'Add new property photos', category: 'Design', priority: 'low', dueDate: 'This week', completed: true, starred: false },
    { id: 4, title: 'Team standup meeting', description: 'Weekly team sync', category: 'Meeting', priority: 'medium', dueDate: 'Today', completed: true, starred: false },
    { id: 5, title: 'Send monthly analytics report', description: 'Compile and send to clients', category: 'Analytics', priority: 'high', dueDate: 'Today', completed: false, starred: true },
    { id: 6, title: 'Prepare presentation for new client', description: 'Mountain Realty onboarding deck', category: 'Content', priority: 'high', dueDate: 'Tomorrow', completed: false, starred: false },
    { id: 7, title: 'Update CRM with new leads', description: 'Add 5 new prospects', category: 'Admin', priority: 'low', dueDate: 'This week', completed: false, starred: false },
  ]);

  const toggleTask = (taskId) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const toggleStar = (taskId, e) => {
    e.stopPropagation();
    setTasks(tasks.map(t => t.id === taskId ? { ...t, starred: !t.starred } : t));
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.completed;
    if (filter === 'pending') return !task.completed;
    if (filter === 'starred') return task.starred;
    return true;
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
  };

  const priorityStyles = {
    high: 'bg-[#ff3b30]/10 text-[#ff3b30]',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Tasks</h1>
          <p className="text-[17px] text-[#86868b]">Manage your tasks and stay organized.</p>
        </div>
        <button className="flex items-center gap-2 h-10 px-5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] active:scale-[0.98] transition-all">
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add Task
        </button>
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

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="p-5 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  task.completed ? 'bg-[#34c759] border-[#34c759]' : 'border-[#d1d1d6] hover:border-[#0071e3]'
                }`}
              >
                {task.completed && (
                  <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h3 className={`text-[15px] font-medium mb-1 ${task.completed ? 'text-[#86868b] line-through' : 'text-[#1d1d1f] dark:text-white'}`}>
                  {task.title}
                </h3>
                <p className="text-[13px] text-[#86868b] mb-3">{task.description}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold text-white bg-gradient-to-r ${categoryColors[task.category] || categoryColors['Admin']}`}>
                    {task.category}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide ${priorityStyles[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] text-[#86868b]">
                    <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {task.dueDate}
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
        ))}
      </div>
    </div>
  );
};

export default V3Tasks;
