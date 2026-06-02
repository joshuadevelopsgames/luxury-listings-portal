import React, { useState, useEffect } from "react";
import { User } from "../entities/User";
import { Tutorial, TutorialProgress, DailyTask, AppIntegration } from "../entities/index";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { supabaseService } from "../services/supabaseService";
import { remoteConfigService } from "../services/remoteConfigService";
import { instagramReportReminderService } from "../services/instagramReportReminderService";
import { postLogReminderService } from "../services/postLogReminderService";

import {
  CheckCircle2,
  Clock,
  BookOpen,
  Target,
  Calendar,
  ArrowRight,
  Trophy,
  Star,
  Users,
  TrendingUp,
  BarChart3,
  FileText,
  Shield,
  UserCheck,
  UserX,
  Activity,
  Sun,
  CheckSquare,
  ChevronRight,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isPast } from "date-fns";

import WelcomeCard from "../components/dashboard/WelcomeCard";
import QuickStats from "../components/dashboard/QuickStats";
import TodaysTasks from "../components/dashboard/TodaysTasks";
import NextTutorials from "../components/dashboard/NextTutorials";
import HRQuickActions from "../components/dashboard/HRQuickActions";
import TimeOffWidget from "../components/dashboard/TimeOffWidget";
import PostLogReminderBanner from "../components/dashboard/PostLogReminderBanner";

export default function Dashboard() {
  const { currentUser, currentRole, getCurrentRolePermissions } = useAuth();
  const navigate = useNavigate();
  const [tutorials, setTutorials] = useState([]);
  const [progress, setProgress] = useState([]);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postLogBanner, setPostLogBanner] = useState({ show: false, clientNames: [] });
  const [todayFocus, setTodayFocus] = useState(false);

  // Onboarding checklist (per-user, persisted in localStorage)
  const onboardingKey = currentUser?.email ? `onboarding_${currentUser.email}` : null;
  const defaultOnboardingItems = [
    { id: 'profile', label: 'Complete your profile', path: '/settings' },
    { id: 'report', label: 'Create your first Instagram report', path: '/instagram-reports' },
    { id: 'client', label: 'Review your assigned clients', path: '/my-clients' },
    { id: 'task', label: 'Add your first task', path: '/tasks' },
    { id: 'time_off', label: 'Check the time-off calendar', path: '/my-time-off' },
  ];
  const [onboardingChecked, setOnboardingChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(onboardingKey || '') || '[]'); } catch { return []; }
  });
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    try { return localStorage.getItem(`${onboardingKey}_dismissed`) === 'true'; } catch { return false; }
  });

  const toggleOnboardingItem = (id) => {
    setOnboardingChecked(prev => {
      const updated = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (onboardingKey) localStorage.setItem(onboardingKey, JSON.stringify(updated));
      return updated;
    });
  };

  const dismissOnboarding = () => {
    setOnboardingDismissed(true);
    if (onboardingKey) localStorage.setItem(`${onboardingKey}_dismissed`, 'true');
  };

  const onboardingComplete = onboardingChecked.length >= defaultOnboardingItems.length;
  const showOnboardingWidget = !onboardingDismissed && !currentUser?.onboardingCompleted && !onboardingComplete;
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingApprovals: 0,
    systemUptime: '99.9%'
  });

  const rolePermissions = getCurrentRolePermissions();

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [currentRole]);

  // Load admin stats once (no real-time listeners for performance)
  // Deferred to after initial page render
  useEffect(() => {
    if (currentRole === 'admin') {
      // Use requestIdleCallback or setTimeout to defer non-critical loads
      const loadAdminStatsDeferred = async () => {
        try {
          // Initialize Remote Config (deferred)
          await remoteConfigService.initialize();
          console.log('✅ Remote Config initialized for admin dashboard');
          
          // Fetch approved users only (pending users disabled)
          const approvedUsers = await supabaseService.getApprovedUsers();
          const configValues = remoteConfigService.getAllValues();
          
          setAdminStats({
            totalUsers: approvedUsers?.length || 0,
            activeUsers: approvedUsers?.filter(u => u.isApproved)?.length || 0,
            pendingApprovals: 0,
            systemUptime: configValues?.systemUptime || '99.9%'
          });
          console.log('✅ Admin stats loaded');
        } catch (error) {
          console.error('Error loading admin stats:', error);
        }
      };

      // Defer loading to not block initial render
      const timeoutId = setTimeout(loadAdminStatsDeferred, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [currentRole]);

  // Check for Instagram report reminders during the last week of each month
  useEffect(() => {
    if (!currentUser?.email || !currentUser?.uid) return;

    // Defer reminder check to not block initial render
    const checkReminders = async () => {
      try {
        const result = await instagramReportReminderService.checkAndSendReminders(
          currentUser.email,
          currentUser.uid,
          currentRole
        );
        if (result.sent) {
          console.log('📸 Instagram report reminder sent for', result.clientsNotified, 'clients');
        }
      } catch (error) {
        console.warn('Could not check Instagram report reminders:', error);
      }
    };

    // Run after a short delay to not impact page load
    const timeoutId = setTimeout(checkReminders, 2000);
    return () => clearTimeout(timeoutId);
  }, [currentUser?.email, currentUser?.uid, currentRole]);

  // Friday: post-log reminder banner for SMMs + optional in-app notification
  useEffect(() => {
    if (!currentUser?.email || !postLogReminderService.isFriday()) return;
    const run = async () => {
      try {
        const banner = await postLogReminderService.getBannerState(currentUser.email, currentUser.uid);
        setPostLogBanner({ show: banner.show, clientNames: banner.clientNames });
        await postLogReminderService.checkAndSendUserReminder(currentUser.email, currentUser.uid);
      } catch (e) {
        console.warn('Post log reminder check failed', e);
      }
    };
    const t = setTimeout(run, 1500);
    return () => clearTimeout(t);
  }, [currentUser?.email, currentUser?.uid]);

  // Admin: notify admins when team members need support (Friday or last week of month)
  useEffect(() => {
    if (currentRole !== 'admin') return;
    const run = async () => {
      try {
        await postLogReminderService.checkAndSendAdminReminders();
      } catch (e) {
        console.warn('Post log admin reminder check failed', e);
      }
    };
    const t = setTimeout(run, 2000);
    return () => clearTimeout(t);
  }, [currentRole]);

  const loadDashboardData = async () => {
    try {
      // Load admin-specific data if user is admin
      if (currentRole === 'admin') {
        await loadAdminStats();
      }

      const [tutorialsData, progressData, tasksData, integrationsData] = await Promise.all([
        Tutorial.list('order_index', currentRole),
        TutorialProgress.filter({ user_email: currentUser.email }),
        DailyTask.filter({ assigned_to: currentUser.email }, '-created_date'),
        AppIntegration.list('priority')
      ]);

      setTutorials(tutorialsData);
      setProgress(progressData);
      setTodaysTasks(tasksData.filter(task => 
        task.due_date && isToday(new Date(task.due_date))
      ));
      setIntegrations(integrationsData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminStats = async () => {
    try {
      console.log('📊 Loading admin statistics...');
      
      // Get approved users count (pending users disabled)
      const approvedUsers = await supabaseService.getApprovedUsers();
      
      // Get system uptime from Remote Config
      let systemUptime = '99.9%';
      try {
        // Initialize Remote Config if not already done
        if (!remoteConfigService.isInitialized) {
          await remoteConfigService.initialize();
        }
        systemUptime = remoteConfigService.getSystemUptime();
      } catch (e) {
        console.warn('⚠️ Could not read systemUptime from Remote Config; using fallback');
      }
      
      // Calculate active users (users who have been active in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeUsers = approvedUsers.filter(user => {
        if (user.lastActive) {
          return new Date(user.lastActive) > thirtyDaysAgo;
        }
        // If no lastActive date, consider them active if they were approved recently
        return user.approvedAt && new Date(user.approvedAt) > thirtyDaysAgo;
      }).length;

      setAdminStats({
        totalUsers: approvedUsers.length,
        activeUsers: activeUsers,
        pendingApprovals: 0,
        systemUptime
      });

      console.log('✅ Admin stats loaded:', {
        totalUsers: approvedUsers.length,
        activeUsers,
        pendingApprovals: 0,
        systemUptime
      });
    } catch (error) {
      console.error('❌ Error loading admin stats:', error);
    }
  };

  const getOverallProgress = () => {
    if (tutorials.length === 0) return 0;
    const completedCount = progress.filter(p => p.status === 'completed').length;
    return Math.round((completedCount / tutorials.length) * 100);
  };

  const getNextTutorials = () => {
    const completedTutorialIds = progress
      .filter(p => p.status === 'completed')
      .map(p => p.tutorial_id);
    
    return tutorials
      .filter(tutorial => !completedTutorialIds.includes(tutorial.id))
      .slice(0, 3);
  };

  const getUpcomingTasks = () => {
    return todaysTasks
      .filter(task => task.status !== 'completed')
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 4);
  };

  const getRoleSpecificStats = () => {
    switch (currentRole) {
      case 'admin':
        return [
          { label: 'Total Users', value: adminStats.totalUsers, icon: Users, color: 'blue' },
          { label: 'Active Users', value: adminStats.activeUsers, icon: UserCheck, color: 'green' },
          { label: 'Pending Approvals', value: adminStats.pendingApprovals, icon: Clock, color: 'yellow' },
          { label: 'System Uptime', value: adminStats.systemUptime, icon: Shield, color: 'purple' }
        ];
      case 'content_director':
        return [
          { label: 'Tutorials Created', value: currentUser?.stats?.tutorialsCreated || 0, icon: BookOpen, color: 'blue' },
          { label: 'Team Members', value: currentUser?.stats?.teamMembers || 0, icon: Users, color: 'green' },
          { label: 'Projects Completed', value: currentUser?.stats?.projectsCompleted || 0, icon: CheckCircle2, color: 'purple' },
          { label: 'Satisfaction Score', value: currentUser?.stats?.satisfactionScore || 0, icon: Star, color: 'yellow' }
        ];
      case 'social_media_manager':
        return [
          { label: 'Posts Created', value: currentUser?.stats?.postsCreated || 0, icon: FileText, color: 'purple' },
          { label: 'Engagement Rate', value: currentUser?.stats?.engagementRate || '0%', icon: TrendingUp, color: 'green' },
          { label: 'Followers Growth', value: currentUser?.stats?.followersGrowth || '0%', icon: Users, color: 'blue' },
          { label: 'Satisfaction Score', value: currentUser?.stats?.satisfactionScore || 0, icon: Star, color: 'yellow' }
        ];
      case 'hr_manager':
        return [
          { label: 'Team Members', value: 25, icon: Users, color: 'green' },
          { label: 'Pending Leave Requests', value: 3, icon: Clock, color: 'yellow' },
          { label: 'Retention Rate', value: '96%', icon: TrendingUp, color: 'blue' },
          { label: 'Team Satisfaction', value: '4.4/5', icon: Star, color: 'purple' }
        ];
      case 'sales_manager':
        return [
          { label: 'Deals Closed', value: currentUser?.stats?.dealsClosed || 0, icon: Target, color: 'green' },
          { label: 'Total Revenue', value: currentUser?.stats?.totalRevenue || '$0', icon: TrendingUp, color: 'blue' },
          { label: 'Conversion Rate', value: currentUser?.stats?.conversionRate || '0%', icon: BarChart3, color: 'purple' },
          { label: 'Satisfaction Score', value: currentUser?.stats?.satisfactionScore || 0, icon: Star, color: 'yellow' }
        ];
      default:
        return [];
    }
  };

  const getRoleSpecificFeatures = () => {
    return rolePermissions.features.map((feature, index) => (
      <div key={index} className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="text-sm text-gray-600">{feature}</span>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <WelcomeCard user={currentUser} overallProgress={getOverallProgress()} currentRole={currentRole} systemUptime={adminStats.systemUptime} adminStats={adminStats} />
        </div>
        {/* Today Focus toggle */}
        <button
          onClick={() => setTodayFocus(f => !f)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors flex-shrink-0 mt-1 ${
            todayFocus
              ? 'bg-[#ff9500] text-white shadow-sm'
              : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
          }`}
        >
          <Sun className="w-4 h-4" />
          {todayFocus ? 'Focus Mode On' : 'Today Focus'}
        </button>
      </div>

      {/* ── Today Focus View */}
      {todayFocus && (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-[#ff9500]/30 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-[#ff9500]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Today's Focus</h2>
            <span className="text-[12px] text-[#86868b] ml-1">{format(new Date(), 'EEEE, MMMM d')}</span>
          </div>
          {(() => {
            const overdue = todaysTasks.filter(t => t.status !== 'completed' && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
            const todayOnly = todaysTasks.filter(t => t.status !== 'completed' && t.due_date && isToday(new Date(t.due_date)));
            const all = [...overdue, ...todayOnly];
            if (all.length === 0) return (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-[#34c759] mx-auto mb-2 opacity-60" />
                <p className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">All clear!</p>
                <p className="text-[13px] text-[#86868b]">No tasks due today or overdue.</p>
              </div>
            );
            return (
              <div className="space-y-2">
                {overdue.length > 0 && <p className="text-[11px] font-semibold text-[#ff3b30] uppercase tracking-wider">Overdue ({overdue.length})</p>}
                {all.map(task => (
                  <div key={task.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${overdue.includes(task) ? 'border-[#ff3b30]/20 bg-[#ff3b30]/5' : 'border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]'}`}>
                    <CheckSquare className={`w-4 h-4 flex-shrink-0 ${overdue.includes(task) ? 'text-[#ff3b30]' : 'text-[#86868b]'}`} />
                    <span className="text-[14px] text-[#1d1d1f] dark:text-white flex-1 truncate">{task.title}</span>
                    {overdue.includes(task) && <span className="text-[11px] text-[#ff3b30] font-medium flex-shrink-0">Overdue</span>}
                  </div>
                ))}
                <button onClick={() => navigate('/tasks')} className="w-full mt-2 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-medium hover:bg-[#0071e3]/20 transition-colors">
                  View All Tasks <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Onboarding Checklist Widget */}
      {showOnboardingWidget && (
        <div className="rounded-2xl bg-gradient-to-br from-[#0071e3]/5 to-[#5856d6]/5 border border-[#0071e3]/20 p-6 relative">
          <button onClick={dismissOnboarding} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[#86868b]">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3] flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Get started</h2>
              <p className="text-[12px] text-[#86868b]">{onboardingChecked.length}/{defaultOnboardingItems.length} steps complete</p>
            </div>
            <div className="ml-auto w-24 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0071e3] rounded-full transition-all duration-500"
                style={{ width: `${Math.round((onboardingChecked.length / defaultOnboardingItems.length) * 100)}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            {defaultOnboardingItems.map(item => {
              const checked = onboardingChecked.includes(item.id);
              return (
                <div key={item.id} className="flex items-center gap-3 py-1">
                  <button
                    onClick={() => toggleOnboardingItem(item.id)}
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      checked ? 'bg-[#34c759] border-[#34c759]' : 'border-black/20 dark:border-white/20 hover:border-[#0071e3]'
                    }`}
                  >
                    {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`text-[13px] text-left transition-colors flex-1 ${checked ? 'line-through text-[#86868b]' : 'text-[#1d1d1f] dark:text-white hover:text-[#0071e3]'}`}
                  >
                    {item.label}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-[#86868b]/40 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {postLogBanner.show && (
        <PostLogReminderBanner clientNames={postLogBanner.clientNames} onDismiss={() => setPostLogBanner(prev => ({ ...prev, show: false }))} />
      )}

      {/* Admin Note - Only show for admin users */}
      {currentRole === 'admin' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">Admin Dashboard</h3>
              <p className="text-sm text-blue-700 mt-1">
                You're viewing the admin dashboard. Use the <strong>Profile Switcher</strong> in the top-right corner 
                to switch to other roles (Content Manager, HR Manager, Sales Manager) and access their specific features.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {!todayFocus && (
        <>
          <QuickStats
            tutorials={tutorials}
            progress={progress}
            todaysTasks={todaysTasks}
            integrations={integrations}
            currentRole={currentRole}
          />

          {/* HR Manager gets specialized dashboard widgets */}
          {currentRole === 'hr_manager' ? (
            <HRQuickActions />
          ) : (
            <>
              <div className="grid lg:grid-cols-3 gap-8">
                <TodaysTasks tasks={getUpcomingTasks()} />
                <NextTutorials tutorials={getNextTutorials()} />
                <TimeOffWidget />
              </div>
            </>
          )}
        </>
      )}

      {/* Role-Specific Stats - Moved to bottom above profile overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getRoleSpecificStats().map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 pt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Role Information Card - Profile overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span className="text-2xl">{rolePermissions.icon}</span>
            <span>{rolePermissions.displayName} Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">About This Role</h4>
              <p className="text-gray-600 mb-4">{rolePermissions.description}</p>
              <div className="space-y-2">
                <h5 className="font-medium text-gray-800">Key Features:</h5>
                <div className="grid grid-cols-1 gap-1">
                  {getRoleSpecificFeatures()}
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">User Profile</h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Name:</span>
                  <p className="font-medium">{currentUser?.displayName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Department:</span>
                  <p className="font-medium">{currentUser?.department}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Start Date:</span>
                  <p className="font-medium">{currentUser?.startDate ? format(new Date(currentUser.startDate), 'MMM dd, yyyy') : 'N/A'}</p>
                </div>
                {currentUser?.bio && (
                  <div>
                    <span className="text-sm text-gray-500">Bio:</span>
                    <p className="text-sm text-gray-600">{currentUser?.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
