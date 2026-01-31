import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  CheckSquare, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ChevronRight,
  Activity,
  Clock
} from 'lucide-react';

/**
 * Demo Dashboard - Apple-style dashboard
 * Clean, minimal, data-focused
 */
const DemoDashboard = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Review client proposals', time: '9:00 AM', priority: 'high', completed: false },
    { id: 2, title: 'Create social media content', time: '11:00 AM', priority: 'medium', completed: false },
    { id: 3, title: 'Team standup meeting', time: '2:00 PM', priority: 'low', completed: true },
    { id: 4, title: 'Update analytics report', time: '4:00 PM', priority: 'medium', completed: false },
  ]);

  const clients = [
    { id: 1, name: 'Oceanview Properties', package: 'Premium', posts: 12 },
    { id: 2, name: 'Mountain Realty', package: 'Standard', posts: 8 },
    { id: 3, name: 'City Living Estates', package: 'Premium', posts: 15 },
  ];

  const toggleTask = (taskId) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = [
    { title: 'Total Clients', value: '24', change: '+12%', up: true, icon: Users },
    { title: 'Active Tasks', value: '18', change: '+8%', up: true, icon: CheckSquare },
    { title: 'Posts This Month', value: '156', change: '+24%', up: true, icon: TrendingUp },
    { title: 'Engagement', value: '4.8%', change: '-3%', up: false, icon: Activity },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">
            {greeting()}, {currentUser?.displayName?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-[17px] text-[#86868b]">
            Here's what's happening today.
          </p>
        </div>
        <button className="
          flex items-center gap-2 h-10 px-5 rounded-full
          bg-[#0071e3] text-white
          text-[13px] font-medium
          shadow-lg shadow-[#0071e3]/25
          hover:bg-[#0077ed] hover:shadow-xl
          active:scale-[0.98]
          transition-all duration-200
        ">
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Task
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => (
          <div 
            key={idx}
            className="p-5 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
                <stat.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <div className={`flex items-center gap-1 text-[13px] font-medium ${
                stat.up ? 'text-[#34c759]' : 'text-[#ff3b30]'
              }`}>
                {stat.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {stat.change}
              </div>
            </div>
            <p className="text-[32px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">{stat.value}</p>
            <p className="text-[13px] text-[#86868b]">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="lg:col-span-2 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Today's Tasks</h2>
              <p className="text-[13px] text-[#86868b]">{tasks.filter(t => !t.completed).length} remaining</p>
            </div>
            <Link to="/v2/tasks" className="flex items-center gap-1 text-[13px] text-[#0071e3] font-medium hover:underline">
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {tasks.map(task => (
              <div 
                key={task.id}
                className="flex items-center gap-4 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                    transition-all duration-200
                    ${task.completed 
                      ? 'bg-[#34c759] border-[#34c759]' 
                      : 'border-[#d1d1d6] hover:border-[#0071e3]'
                    }
                  `}
                >
                  {task.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] font-medium ${task.completed ? 'text-[#86868b] line-through' : 'text-[#1d1d1f] dark:text-white'}`}>
                    {task.title}
                  </p>
                  <p className="text-[12px] text-[#86868b] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {task.time}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide ${
                  task.priority === 'high' 
                    ? 'bg-[#ff3b30]/10 text-[#ff3b30]'
                    : task.priority === 'medium'
                      ? 'bg-[#ff9500]/10 text-[#ff9500]'
                      : 'bg-[#34c759]/10 text-[#34c759]'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Clients */}
        <div className="rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Recent Clients</h2>
              <p className="text-[13px] text-[#86868b]">Active packages</p>
            </div>
            <Link to="/v2/clients" className="flex items-center gap-1 text-[13px] text-[#0071e3] font-medium hover:underline">
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {clients.map((client, idx) => (
              <div 
                key={client.id}
                className="flex items-center gap-4 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-semibold
                  ${idx === 0 ? 'bg-gradient-to-br from-[#0071e3] to-[#5856d6]' : 
                    idx === 1 ? 'bg-gradient-to-br from-[#ff9500] to-[#ff3b30]' :
                    'bg-gradient-to-br from-[#34c759] to-[#30d158]'}
                `}>
                  {client.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white truncate">{client.name}</p>
                  <p className="text-[12px] text-[#86868b]">{client.package}</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{client.posts}</p>
                  <p className="text-[11px] text-[#86868b]">posts left</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Create Content', icon: Plus, color: 'from-[#0071e3] to-[#5856d6]' },
          { title: 'Schedule Post', icon: Calendar, color: 'from-[#ff9500] to-[#ff3b30]' },
          { title: 'View Analytics', icon: TrendingUp, color: 'from-[#34c759] to-[#30d158]' },
          { title: 'Manage Team', icon: Users, color: 'from-[#5856d6] to-[#af52de]' },
        ].map((action, idx) => (
          <button
            key={idx}
            className="p-5 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left group"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">{action.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DemoDashboard;
