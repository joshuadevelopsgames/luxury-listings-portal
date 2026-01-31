import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, CheckCircle2, Clock, ArrowUpRight, Briefcase, ListTodo, Calendar, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { DailyTask } from '../../entities/DailyTask';

/**
 * V3 Analytics - Real Data from Firestore
 * Shows task and client statistics
 */
const V3Analytics = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);

  // Load all data
  useEffect(() => {
    loadData();
  }, [currentUser?.email]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, clientsData, teamData] = await Promise.all([
        currentUser?.email ? DailyTask.filter({ assigned_to: currentUser.email }, '-due_date') : [],
        firestoreService.getClients(),
        firestoreService.getApprovedUsers()
      ]);
      setTasks(tasksData || []);
      setClients(clientsData || []);
      setTeam(teamData || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics = [
    { 
      title: 'Total Tasks', 
      value: tasks.length.toString(), 
      icon: ListTodo,
      color: 'from-[#0071e3] to-[#5856d6]'
    },
    { 
      title: 'Completed', 
      value: tasks.filter(t => t.status === 'completed').length.toString(), 
      icon: CheckCircle2,
      color: 'from-[#34c759] to-[#30d158]'
    },
    { 
      title: 'Total Clients', 
      value: clients.length.toString(), 
      icon: Briefcase,
      color: 'from-[#ff9500] to-[#ff3b30]'
    },
    { 
      title: 'Team Members', 
      value: team.length.toString(), 
      icon: Users,
      color: 'from-[#af52de] to-[#ff2d55]'
    },
  ];

  // Client package breakdown
  const packageBreakdown = {
    premium: clients.filter(c => c.packageType?.toLowerCase() === 'premium').length,
    standard: clients.filter(c => c.packageType?.toLowerCase() === 'standard').length,
    basic: clients.filter(c => c.packageType?.toLowerCase() === 'basic' || !c.packageType).length,
  };

  // Task status breakdown
  const taskStatusBreakdown = {
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending' || t.status !== 'completed').length,
    highPriority: tasks.filter(t => t.priority?.toLowerCase() === 'high' || t.priority?.toLowerCase() === 'urgent').length,
  };

  // Recent clients
  const recentClients = [...clients]
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
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
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Analytics</h1>
          <p className="text-[17px] text-[#86868b]">Overview of your tasks and clients.</p>
        </div>
        <button 
          onClick={loadData}
          className="h-10 px-4 rounded-full bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={2} />
          Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center shadow-lg`}>
                <metric.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-[32px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">{metric.value}</p>
            <p className="text-[13px] text-[#86868b]">{metric.title}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Task Distribution */}
        <div className="rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 p-6">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-4">Task Distribution</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#34c759] flex items-center justify-center text-white">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">Completed</span>
                  <span className="text-[14px] font-semibold text-[#34c759]">{taskStatusBreakdown.completed}</span>
                </div>
                <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#34c759] rounded-full transition-all"
                    style={{ width: `${tasks.length > 0 ? (taskStatusBreakdown.completed / tasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#ff9500] flex items-center justify-center text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">Pending</span>
                  <span className="text-[14px] font-semibold text-[#ff9500]">{taskStatusBreakdown.pending}</span>
                </div>
                <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ff9500] rounded-full transition-all"
                    style={{ width: `${tasks.length > 0 ? (taskStatusBreakdown.pending / tasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#ff3b30] flex items-center justify-center text-white">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">High Priority</span>
                  <span className="text-[14px] font-semibold text-[#ff3b30]">{taskStatusBreakdown.highPriority}</span>
                </div>
                <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ff3b30] rounded-full transition-all"
                    style={{ width: `${tasks.length > 0 ? (taskStatusBreakdown.highPriority / tasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Client Packages */}
        <div className="rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 p-6">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-4">Client Packages</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5856d6] to-[#af52de] flex items-center justify-center text-white font-bold text-sm">
                P
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">Premium</span>
                  <span className="text-[14px] font-semibold text-[#5856d6]">{packageBreakdown.premium}</span>
                </div>
                <p className="text-[13px] text-[#86868b]">{clients.length > 0 ? Math.round((packageBreakdown.premium / clients.length) * 100) : 0}% of clients</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">Standard</span>
                  <span className="text-[14px] font-semibold text-[#0071e3]">{packageBreakdown.standard}</span>
                </div>
                <p className="text-[13px] text-[#86868b]">{clients.length > 0 ? Math.round((packageBreakdown.standard / clients.length) * 100) : 0}% of clients</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#86868b] to-[#636366] flex items-center justify-center text-white font-bold text-sm">
                B
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">Basic</span>
                  <span className="text-[14px] font-semibold text-[#86868b]">{packageBreakdown.basic}</span>
                </div>
                <p className="text-[13px] text-[#86868b]">{clients.length > 0 ? Math.round((packageBreakdown.basic / clients.length) * 100) : 0}% of clients</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] p-6 text-white">
          <h2 className="text-[17px] font-semibold mb-6">Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Completion Rate</span>
              <span className="font-semibold">
                {tasks.length > 0 ? Math.round((taskStatusBreakdown.completed / tasks.length) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Active Clients</span>
              <span className="font-semibold">{clients.filter(c => c.approvalStatus === 'Approved').length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Premium Clients</span>
              <span className="font-semibold">{packageBreakdown.premium}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Team Size</span>
              <span className="font-semibold">{team.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Clients */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Recent Clients</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5">
                <th className="text-left p-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Client</th>
                <th className="text-left p-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Package</th>
                <th className="text-right p-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentClients.length > 0 ? recentClients.map((client, idx) => (
                <tr key={idx} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-[14px] font-medium text-[#1d1d1f] dark:text-white">{client.clientName || 'Unknown'}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-black/5 dark:bg-white/5 text-[#1d1d1f] dark:text-white">
                      {client.packageType || 'Standard'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                      client.approvalStatus === 'Approved' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'
                    }`}>
                      {client.approvalStatus || 'Pending'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-[#86868b]">No clients yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default V3Analytics;
