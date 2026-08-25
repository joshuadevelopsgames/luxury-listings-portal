import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, CheckCircle2, Clock, ArrowUpRight, Briefcase, ListTodo, Calendar, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseService } from '../../services/supabaseService';
import { DailyTask } from '../../entities/DailyTask';
import ClientLink from '../../components/ui/ClientLink';

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
        supabaseService.getClients(),
        supabaseService.getApprovedUsers()
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
      color: 'from-brand to-brand'
    },
    { 
      title: 'Completed', 
      value: tasks.filter(t => t.status === 'completed').length.toString(), 
      icon: CheckCircle2,
      color: 'from-positive to-positive'
    },
    { 
      title: 'Total Clients', 
      value: clients.length.toString(), 
      icon: Briefcase,
      color: 'from-warning to-danger'
    },
    { 
      title: 'Team Members', 
      value: team.length.toString(), 
      icon: Users,
      color: 'from-brand to-[#ff2d55]'
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
        <div className="h-12 bg-surface-3 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-3 rounded-xl animate-pulse" />
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
          <h1 className="text-[34px] font-semibold text-ink tracking-[-0.02em] mb-1">Analytics</h1>
          <p className="text-[17px] text-ink-muted">Overview of your tasks and clients.</p>
        </div>
        <button 
          onClick={loadData}
          className="h-10 px-4 rounded-full bg-surface-3 text-[13px] font-medium text-ink hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={2} />
          Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, idx) => (
          <div key={idx} className="p-5 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center shadow-lg`}>
                <metric.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-[32px] font-semibold text-ink tracking-[-0.02em] mb-1">{metric.value}</p>
            <p className="text-[13px] text-ink-muted">{metric.title}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Task Distribution */}
        <div className="rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 p-6">
          <h2 className="text-[17px] font-semibold text-ink mb-4">Task Distribution</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-positive flex items-center justify-center text-white">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[14px] font-medium text-ink">Completed</span>
                  <span className="text-[14px] font-semibold text-positive">{taskStatusBreakdown.completed}</span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-positive rounded-full transition-all"
                    style={{ width: `${tasks.length > 0 ? (taskStatusBreakdown.completed / tasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-warning flex items-center justify-center text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[14px] font-medium text-ink">Pending</span>
                  <span className="text-[14px] font-semibold text-warning">{taskStatusBreakdown.pending}</span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-warning rounded-full transition-all"
                    style={{ width: `${tasks.length > 0 ? (taskStatusBreakdown.pending / tasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-danger flex items-center justify-center text-white">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[14px] font-medium text-ink">High Priority</span>
                  <span className="text-[14px] font-semibold text-danger">{taskStatusBreakdown.highPriority}</span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-danger rounded-full transition-all"
                    style={{ width: `${tasks.length > 0 ? (taskStatusBreakdown.highPriority / tasks.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posting Packages */}
        <div className="rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 p-6">
          <h2 className="text-[17px] font-semibold text-ink mb-4">Posting Packages</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand flex items-center justify-center text-white font-bold text-sm">
                P
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[14px] font-medium text-ink">Premium</span>
                  <span className="text-[14px] font-semibold text-brand">{packageBreakdown.premium}</span>
                </div>
                <p className="text-[13px] text-ink-muted">{clients.length > 0 ? Math.round((packageBreakdown.premium / clients.length) * 100) : 0}% of clients</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[14px] font-medium text-ink">Standard</span>
                  <span className="text-[14px] font-semibold text-brand">{packageBreakdown.standard}</span>
                </div>
                <p className="text-[13px] text-ink-muted">{clients.length > 0 ? Math.round((packageBreakdown.standard / clients.length) * 100) : 0}% of clients</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink-muted to-[#636366] flex items-center justify-center text-white font-bold text-sm">
                B
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[14px] font-medium text-ink">Basic</span>
                  <span className="text-[14px] font-semibold text-ink-muted">{packageBreakdown.basic}</span>
                </div>
                <p className="text-[13px] text-ink-muted">{clients.length > 0 ? Math.round((packageBreakdown.basic / clients.length) * 100) : 0}% of clients</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl bg-gradient-to-br from-brand to-brand p-6 text-white">
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
      <div className="rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-ink">Recent Clients</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5">
                <th className="text-left p-4 text-[12px] font-semibold text-ink-muted uppercase tracking-wide">Client</th>
                <th className="text-left p-4 text-[12px] font-semibold text-ink-muted uppercase tracking-wide">Package</th>
                <th className="text-right p-4 text-[12px] font-semibold text-ink-muted uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentClients.length > 0 ? recentClients.map((client, idx) => (
                <tr key={idx} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-[14px] font-medium"><ClientLink client={client} /></td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-surface-3 text-ink">
                      {client.packageType || 'Standard'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                      client.approvalStatus === 'Approved' ? 'bg-positive/10 text-positive' : 'bg-warning/10 text-warning'
                    }`}>
                      {client.approvalStatus || 'Pending'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-ink-muted">No clients yet</td>
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
