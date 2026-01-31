import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { 
  CheckCircle2, 
  Clock, 
  Calendar,
  ArrowRight,
  Users,
  TrendingUp,
  BarChart3,
  FileText,
  AlertCircle,
  ChevronRight,
  Plus,
  Play,
  Eye,
  Edit,
  Send,
  Image,
  Video,
  Instagram,
  Sparkles,
  Target,
  Bell,
  MessageSquare,
  Zap
} from 'lucide-react';
import { format, isToday, isTomorrow, addDays, parseISO, isPast, isFuture, isWithinInterval, startOfDay, endOfDay, addWeeks } from 'date-fns';

/**
 * V3 Dashboard - Workflow-Focused with Real Data
 * 
 * REAL DATA:
 * - Today's Priorities (from Tasks)
 * - Upcoming Deadlines (from Tasks)
 * 
 * MOCK DATA (to be built):
 * - Content Pipeline stats
 * - Client Status / Package utilization
 * - Recent Activity
 * - Weekly Stats
 */
const V3Dashboard = () => {
  const { currentUser, currentRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  // ============================================================================
  // MOCK DATA - TO BE REMOVED/REPLACED LATER
  // ============================================================================
  const mockContentPipeline = {
    drafts: 8,
    pendingApproval: 4,
    scheduled: 12,
    publishedThisWeek: 23
  };

  const mockClientHealth = [
    { id: 1, name: 'Oceanview Properties', package: 'Premium', postsUsed: 16, postsTotal: 20, health: 'good' },
    { id: 2, name: 'Mountain Realty', package: 'Standard', postsUsed: 14, postsTotal: 15, health: 'warning' },
    { id: 3, name: 'City Living Estates', package: 'Premium', postsUsed: 5, postsTotal: 20, health: 'good' },
    { id: 4, name: 'Sunset Homes', package: 'Basic', postsUsed: 10, postsTotal: 10, health: 'critical' },
  ];

  const mockRecentActivity = [
    { id: 1, action: 'Post published', detail: 'Beachfront Villa Tour', client: 'Oceanview', time: '2 hours ago', icon: Send },
    { id: 2, action: 'Content approved', detail: 'Mountain property photos', client: 'Mountain Realty', time: '3 hours ago', icon: CheckCircle2 },
    { id: 3, action: 'New comment', detail: 'Great engagement on villa post', client: 'Oceanview', time: '4 hours ago', icon: MessageSquare },
    { id: 4, action: 'Draft created', detail: 'Downtown loft showcase', client: 'City Living', time: '5 hours ago', icon: Edit },
  ];

  const mockWeeklyStats = {
    postsPublished: 23,
    totalReach: '45.2K',
    engagement: '8.4%',
    newFollowers: 847
  };
  // ============================================================================
  // END MOCK DATA
  // ============================================================================

  // Fetch real tasks from Firestore
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        // Get all tasks (or tasks assigned to current user)
        let allTasks = [];
        
        if (currentUser?.email) {
          // Try to get user's tasks first
          try {
            allTasks = await firestoreService.getTasksByUser(currentUser.email);
          } catch (e) {
            // Fallback to all tasks
            allTasks = await firestoreService.getTasks();
          }
        } else {
          allTasks = await firestoreService.getTasks();
        }

        setTasks(allTasks);

        // Filter for today's tasks
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);

        const todayFiltered = allTasks.filter(task => {
          if (!task.due_date) return false;
          try {
            const dueDate = typeof task.due_date === 'string' 
              ? parseISO(task.due_date) 
              : task.due_date.toDate ? task.due_date.toDate() : new Date(task.due_date);
            return isWithinInterval(dueDate, { start: todayStart, end: todayEnd }) && task.status !== 'completed';
          } catch {
            return false;
          }
        }).slice(0, 5); // Limit to 5 items

        setTodaysTasks(todayFiltered);

        // Filter for upcoming deadlines (next 2 weeks, excluding today)
        const twoWeeksFromNow = addWeeks(today, 2);
        
        const upcomingFiltered = allTasks.filter(task => {
          if (!task.due_date) return false;
          try {
            const dueDate = typeof task.due_date === 'string' 
              ? parseISO(task.due_date) 
              : task.due_date.toDate ? task.due_date.toDate() : new Date(task.due_date);
            return isFuture(dueDate) && !isToday(dueDate) && dueDate <= twoWeeksFromNow && task.status !== 'completed';
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          const dateA = typeof a.due_date === 'string' ? parseISO(a.due_date) : a.due_date.toDate ? a.due_date.toDate() : new Date(a.due_date);
          const dateB = typeof b.due_date === 'string' ? parseISO(b.due_date) : b.due_date.toDate ? b.due_date.toDate() : new Date(b.due_date);
          return dateA - dateB;
        })
        .slice(0, 5); // Limit to 5 items

        setUpcomingDeadlines(upcomingFiltered);

      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentUser?.email]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'good': return 'bg-[#34c759]';
      case 'warning': return 'bg-[#ff9500]';
      case 'critical': return 'bg-[#ff3b30]';
      default: return 'bg-[#86868b]';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-[#ff3b30]/10 text-[#ff3b30]';
      case 'medium': return 'bg-[#ff9500]/10 text-[#ff9500]';
      case 'low': return 'bg-[#34c759]/10 text-[#34c759]';
      default: return 'bg-[#86868b]/10 text-[#86868b]';
    }
  };

  const getTaskIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'content': return Edit;
      case 'review': return Eye;
      case 'meeting': return Users;
      case 'design': return Image;
      default: return CheckCircle2;
    }
  };

  const formatTaskDate = (dateValue) => {
    try {
      const date = typeof dateValue === 'string' 
        ? parseISO(dateValue) 
        : dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      return format(date, 'MMM d');
    } catch {
      return 'No date';
    }
  };

  const quickActions = [
    { title: 'Create Post', icon: Plus, color: 'from-[#0071e3] to-[#5856d6]', path: '/v3/content-calendar' },
    { title: 'Schedule Content', icon: Calendar, color: 'from-[#ff9500] to-[#ff3b30]', path: '/v3/content-calendar' },
    { title: 'View Analytics', icon: BarChart3, color: 'from-[#34c759] to-[#30d158]', path: '/v3/analytics' },
    { title: 'Client Packages', icon: Users, color: 'from-[#5856d6] to-[#af52de]', path: '/v3/client-packages' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">
            {greeting()}, {currentUser?.displayName?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-[17px] text-[#86868b]">
            {format(new Date(), 'EEEE, MMMM d')} • Here's your workflow overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/v3/tasks"
            className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {tasks.filter(t => t.status !== 'completed').length} Tasks
          </Link>
          <Link 
            to="/v3/content-calendar"
            className="h-10 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Content
          </Link>
        </div>
      </div>

      {/* Content Pipeline Overview - MOCK DATA */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Drafts', value: mockContentPipeline.drafts, icon: Edit, color: 'text-[#86868b]' },
          { label: 'Pending Approval', value: mockContentPipeline.pendingApproval, icon: Clock, color: 'text-[#ff9500]' },
          { label: 'Scheduled', value: mockContentPipeline.scheduled, icon: Calendar, color: 'text-[#0071e3]' },
          { label: 'Published This Week', value: mockContentPipeline.publishedThisWeek, icon: CheckCircle2, color: 'text-[#34c759]' },
        ].map((item, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 hover:shadow-lg transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <item.icon className={`w-5 h-5 ${item.color}`} strokeWidth={1.5} />
              <span className="text-[10px] text-[#86868b] bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">MOCK</span>
            </div>
            <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">{item.value}</p>
            <p className="text-[13px] text-[#86868b]">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Priorities - REAL DATA */}
        <div className="lg:col-span-2 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#ff9500]" />
                Today's Priorities
              </h2>
              <p className="text-[13px] text-[#86868b]">
                {todaysTasks.length > 0 ? `${todaysTasks.length} tasks due today` : 'No tasks due today'}
              </p>
            </div>
            <Link to="/v3/tasks" className="text-[13px] text-[#0071e3] font-medium hover:underline flex items-center gap-1">
              View all tasks <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {todaysTasks.length > 0 ? (
              todaysTasks.map((task) => {
                const TaskIcon = getTaskIcon(task.category);
                return (
                  <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getPriorityColor(task.priority)}`}>
                      <TaskIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white truncate">{task.title || task.name}</p>
                        {task.priority?.toLowerCase() === 'high' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#ff3b30]/10 text-[#ff3b30] uppercase">Urgent</span>
                        )}
                      </div>
                      <p className="text-[13px] text-[#86868b]">
                        {task.client_name || task.category || 'Task'} 
                        {task.due_time && ` • ${task.due_time}`}
                      </p>
                    </div>
                    <Link to="/v3/tasks" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <Play className="w-4 h-4 text-[#0071e3]" />
                    </Link>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-[#34c759] mx-auto mb-3" />
                <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">All caught up!</p>
                <p className="text-[13px] text-[#86868b]">No tasks due today</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-black/5 dark:border-white/5">
            <Link 
              to="/v3/tasks"
              className="w-full h-10 rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 text-[13px] font-medium text-[#86868b] hover:border-[#0071e3] hover:text-[#0071e3] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </Link>
          </div>
        </div>

        {/* Client Health - MOCK DATA */}
        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Client Status</h2>
              <p className="text-[13px] text-[#86868b]">Package utilization</p>
            </div>
            <span className="text-[10px] text-[#86868b] bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">MOCK</span>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {mockClientHealth.map((client) => (
              <div key={client.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getHealthColor(client.health)}`} />
                    <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{client.name}</span>
                  </div>
                  <span className="text-[12px] text-[#86868b]">{client.postsUsed}/{client.postsTotal}</span>
                </div>
                <div className="h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${getHealthColor(client.health)}`}
                    style={{ width: `${(client.postsUsed / client.postsTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines - REAL DATA */}
        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 overflow-hidden">
          <div className="p-5 border-b border-black/5 dark:border-white/5">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-[#ff3b30]" />
              Upcoming Deadlines
            </h2>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((task) => (
                <div key={task.id} className="p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white mb-1 truncate">{task.title || task.name}</p>
                  <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatTaskDate(task.due_date)}</span>
                    {task.client_name && (
                      <>
                        <span>•</span>
                        <span>{task.client_name}</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <Calendar className="w-10 h-10 text-[#86868b] mx-auto mb-2" />
                <p className="text-[13px] text-[#86868b]">No upcoming deadlines</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity - MOCK DATA */}
        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Recent Activity</h2>
            <span className="text-[10px] text-[#86868b] bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">MOCK</span>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {mockRecentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-4">
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <activity.icon className="w-4 h-4 text-[#86868b]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{activity.action}</p>
                  <p className="text-[12px] text-[#86868b] truncate">{activity.detail}</p>
                  <p className="text-[11px] text-[#c7c7cc] mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Performance - MOCK DATA */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] p-6 text-white relative overflow-hidden">
          <span className="absolute top-3 right-3 text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded">MOCK</span>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-[17px] font-semibold">This Week</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[28px] font-semibold">{mockWeeklyStats.postsPublished}</p>
              <p className="text-[13px] text-white/70">Posts Published</p>
            </div>
            <div>
              <p className="text-[28px] font-semibold">{mockWeeklyStats.totalReach}</p>
              <p className="text-[13px] text-white/70">Total Reach</p>
            </div>
            <div>
              <p className="text-[28px] font-semibold">{mockWeeklyStats.engagement}</p>
              <p className="text-[13px] text-white/70">Engagement</p>
            </div>
            <div>
              <p className="text-[28px] font-semibold">+{mockWeeklyStats.newFollowers}</p>
              <p className="text-[13px] text-white/70">New Followers</p>
            </div>
          </div>
          <Link 
            to="/v3/analytics" 
            className="mt-6 w-full h-10 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center gap-2 text-[13px] font-medium"
          >
            View Full Analytics
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {quickActions.map((action, idx) => (
          <Link
            key={idx}
            to={action.path}
            className="p-5 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] dark:backdrop-blur-xl border border-gray-200 dark:border-white/5 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">{action.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default V3Dashboard;
