import React, { useState, useEffect } from "react";
import { User } from "../entities/User";
import { Tutorial, TutorialProgress, DailyTask, AppIntegration } from "../entities/index";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { firestoreService } from "../services/firestoreService";
import { remoteConfigService } from "../services/remoteConfigService";
import { instagramReportReminderService } from "../services/instagramReportReminderService";

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
  Activity
} from "lucide-react";
import { format, isToday, isPast } from "date-fns";

import WelcomeCard from "../components/dashboard/WelcomeCard";
import QuickStats from "../components/dashboard/QuickStats";
import TodaysTasks from "../components/dashboard/TodaysTasks";
import NextTutorials from "../components/dashboard/NextTutorials";
import HRQuickActions from "../components/dashboard/HRQuickActions";
import TimeOffWidget from "../components/dashboard/TimeOffWidget";

export default function Dashboard() {
  const { currentUser, currentRole, getCurrentRolePermissions } = useAuth();
  const [tutorials, setTutorials] = useState([]);
  const [progress, setProgress] = useState([]);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
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
          
          // Fetch counts once
          const [approvedUsers, pendingUsers] = await Promise.all([
            firestoreService.getApprovedUsers(),
            firestoreService.getPendingUsers()
          ]);
          
          const configValues = remoteConfigService.getAllValues();
          
          setAdminStats({
            totalUsers: approvedUsers?.length || 0,
            activeUsers: approvedUsers?.filter(u => u.isApproved)?.length || 0,
            pendingApprovals: pendingUsers?.length || 0,
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

  // Check for Instagram report reminders on the 1st of the month
  useEffect(() => {
    if (!currentUser?.email || !currentUser?.uid) return;
    
    // Defer reminder check to not block initial render
    const checkReminders = async () => {
      try {
        const result = await instagramReportReminderService.checkAndSendReminders(
          currentUser.email,
          currentUser.uid
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
  }, [currentUser?.email, currentUser?.uid]);

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
      
      // Get approved users count
      const approvedUsers = await firestoreService.getApprovedUsers();
      
      // Get pending users count
      const pendingUsers = await firestoreService.getPendingUsers();
      
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
        pendingApprovals: pendingUsers.length,
        systemUptime
      });

      console.log('✅ Admin stats loaded:', {
        totalUsers: approvedUsers.length,
        activeUsers,
        pendingApprovals: pendingUsers.length,
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
      <WelcomeCard user={currentUser} overallProgress={getOverallProgress()} currentRole={currentRole} systemUptime={adminStats.systemUptime} adminStats={adminStats} />
      
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
