import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Target,
  Palette,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Star,
  FileText,
  Heart,
  Shield,
  UserCheck,
  Settings
} from 'lucide-react';

const QuickStats = ({ tutorials, progress, todaysTasks, integrations, currentRole }) => {
  const completedTutorials = progress.filter(p => p.status === 'completed').length;
  const inProgressTutorials = progress.filter(p => p.status === 'in_progress').length;
  const pendingTasks = todaysTasks.filter(task => task.status !== 'completed').length;
  const activeTools = integrations.filter(app => app.status === 'active').length;

  const getContentReadinessScore = () => {
    const tutorialProgress = tutorials.length > 0 ? (completedTutorials / tutorials.length) * 0.6 : 0;
    const taskProgress = todaysTasks.length > 0 ? (1 - (pendingTasks / todaysTasks.length)) * 0.4 : 0;
    return Math.round((tutorialProgress + taskProgress) * 100);
  };

  const getRoleSpecificContent = () => {
    switch (currentRole) {
      case 'admin':
        return {
          contentTools: [
            { name: 'User Management', icon: Users, status: 'active' },
            { name: 'Role Assignment', icon: Shield, status: 'active' },
            { name: 'System Monitoring', icon: BarChart3, status: 'active' },
            { name: 'Security Dashboard', icon: UserCheck, status: 'active' },
            { name: 'Admin Panel', icon: Settings, status: 'active' },
            { name: 'System Logs', icon: FileText, status: 'active' }
          ],
          trainingModules: {
            title: 'Admin Training',
            subtitle: 'Modules Available',
            description: 'System administration and user management training'
          },
          contentTasks: {
            title: 'Today\'s Admin Tasks',
            subtitle: 'Tasks Assigned',
            description: 'User management and system administration'
          },
          contentToolbox: {
            title: 'Admin Toolbox',
            subtitle: 'Tools Available',
            description: 'Essential system administration tools'
          },
          contentReadiness: {
            title: 'Admin Readiness',
            subtitle: 'Ready to Admin',
            description: 'Your system administration expertise level'
          }
        };
      case 'content_director':
        return {
          contentTools: [
            { name: 'Later.com', icon: Calendar, status: 'active' },
            { name: 'ClickUp', icon: Target, status: 'active' },
            { name: 'Canva', icon: Palette, status: 'active' },
            { name: 'Air.inc', icon: Palette, status: 'active' },
            { name: 'CapCut', icon: TrendingUp, status: 'active' },
            { name: 'Meta Business Suite', icon: BarChart3, status: 'active' }
          ],
          trainingModules: {
            title: 'Training Modules',
            subtitle: 'Total Available',
            description: 'Content strategy and creative direction training'
          },
          contentTasks: {
            title: 'Today\'s Content Tasks',
            subtitle: 'Tasks Assigned',
            description: 'Content planning and creative direction'
          },
          contentToolbox: {
            title: 'Content Toolbox',
            subtitle: 'Tools Available',
            description: 'Essential tools for content creation'
          },
          contentReadiness: {
            title: 'Content Readiness',
            subtitle: 'Ready to Lead',
            description: 'Your content leadership expertise level'
          }
        };

      case 'social_media_manager':
        return {
          contentTools: [
            { name: 'Instagram', icon: Heart, status: 'active' },
            { name: 'Facebook', icon: Users, status: 'active' },
            { name: 'LinkedIn', icon: BarChart3, status: 'active' },
            { name: 'TikTok', icon: TrendingUp, status: 'active' },
            { name: 'Hootsuite', icon: Calendar, status: 'active' },
            { name: 'Canva', icon: Palette, status: 'active' }
          ],
          trainingModules: {
            title: 'Social Training',
            subtitle: 'Modules Available',
            description: 'Social media strategy and engagement training'
          },
          contentTasks: {
            title: 'Today\'s Social Tasks',
            subtitle: 'Posts to Create',
            description: 'Content creation and community management'
          },
          contentToolbox: {
            title: 'Social Toolbox',
            subtitle: 'Platforms & Tools',
            description: 'Essential social media tools'
          },
          contentReadiness: {
            title: 'Social Readiness',
            subtitle: 'Ready to Engage',
            description: 'Your social media expertise level'
          }
        };

      case 'hr_manager':
        return {
          contentTools: [
            { name: 'BambooHR', icon: Users, status: 'active' },
            { name: 'Slack', icon: Star, status: 'active' },
            { name: 'Zoom', icon: Calendar, status: 'active' },
            { name: 'Asana', icon: Target, status: 'active' },
            { name: 'Google Workspace', icon: BarChart3, status: 'active' },
            { name: 'LMS Platform', icon: BookOpen, status: 'active' }
          ],
          trainingModules: {
            title: 'HR Training',
            subtitle: 'Modules Available',
            description: 'HR management and team development training'
          },
          contentTasks: {
            title: 'Today\'s HR Tasks',
            subtitle: 'Tasks Assigned',
            description: 'Team management and HR operations'
          },
          contentToolbox: {
            title: 'HR Toolbox',
            subtitle: 'Tools Available',
            description: 'Essential HR management tools'
          },
          contentReadiness: {
            title: 'HR Readiness',
            subtitle: 'Ready to Lead',
            description: 'Your HR leadership expertise level'
          }
        };

      case 'sales_manager':
        return {
          contentTools: [
            { name: 'Salesforce CRM', icon: Target, status: 'active' },
            { name: 'HubSpot', icon: Star, status: 'active' },
            { name: 'Zoom', icon: Calendar, status: 'active' },
            { name: 'LinkedIn Sales', icon: TrendingUp, status: 'active' },
            { name: 'Google Workspace', icon: BarChart3, status: 'active' },
            { name: 'Sales Analytics', icon: BookOpen, status: 'active' }
          ],
          trainingModules: {
            title: 'Sales Training',
            subtitle: 'Modules Available',
            description: 'Sales process and CRM management training'
          },
          contentTasks: {
            title: 'Today\'s Sales Tasks',
            subtitle: 'Tasks Assigned',
            description: 'Lead management and sales operations'
          },
          contentToolbox: {
            title: 'Sales Toolbox',
            subtitle: 'Tools Available',
            description: 'Essential sales management tools'
          },
          contentReadiness: {
            title: 'Sales Readiness',
            subtitle: 'Ready to Sell',
            description: 'Your sales leadership expertise level'
          }
        };

      default:
        return {
          contentTools: [
            { name: 'Later.com', icon: Calendar, status: 'active' },
            { name: 'ClickUp', icon: Target, status: 'active' },
            { name: 'Canva', icon: Palette, status: 'active' },
            { name: 'Air.inc', icon: Palette, status: 'active' },
            { name: 'CapCut', icon: TrendingUp, status: 'active' },
            { name: 'Meta Business Suite', icon: BarChart3, status: 'active' }
          ],
          trainingModules: {
            title: 'Training Modules',
            subtitle: 'Total Available',
            description: 'Professional development training'
          },
          contentTasks: {
            title: 'Today\'s Tasks',
            subtitle: 'Tasks Assigned',
            description: 'Daily responsibilities and goals'
          },
          contentToolbox: {
            title: 'Professional Toolbox',
            subtitle: 'Tools Available',
            description: 'Essential tools for your role'
          },
          contentReadiness: {
            title: 'Professional Readiness',
            subtitle: 'Ready to Excel',
            description: 'Your professional expertise level'
          }
        };
    }
  };

  const roleContent = getRoleSpecificContent();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Training Modules */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <BookOpen className="w-5 h-5" />
            {roleContent.trainingModules.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-900 mb-2">{tutorials.length}</p>
            <p className="text-sm text-blue-700 mb-3">{roleContent.trainingModules.subtitle}</p>
            <p className="text-xs text-blue-600 mb-3">{roleContent.trainingModules.description}</p>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                {completedTutorials} Completed
              </Badge>
              {inProgressTutorials > 0 && (
                <Badge variant="outline" className="border-blue-300 text-blue-700">
                  {inProgressTutorials} In Progress
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Content Tasks */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Target className="w-5 h-5" />
            {roleContent.contentTasks.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-900 mb-2">{todaysTasks.length}</p>
            <p className="text-sm text-green-700 mb-3">{roleContent.contentTasks.subtitle}</p>
            <p className="text-xs text-green-600 mb-3">{roleContent.contentTasks.description}</p>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="bg-green-200 text-green-800">
                {todaysTasks.length - pendingTasks} Completed
              </Badge>
              {pendingTasks > 0 && (
                <Badge variant="outline" className="border-green-300 text-green-700">
                  {pendingTasks} Pending
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Toolbox */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Palette className="w-5 h-5" />
            {roleContent.contentToolbox.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-900 mb-2">{roleContent.contentTools.length}</p>
            <p className="text-sm text-purple-700 mb-3">{roleContent.contentToolbox.subtitle}</p>
            <p className="text-xs text-purple-600 mb-3">{roleContent.contentToolbox.description}</p>
            <div className="grid grid-cols-3 gap-1">
              {roleContent.contentTools.slice(0, 6).map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <div key={index} className="flex items-center justify-center p-1">
                    <Icon className="w-4 h-4 text-purple-600" />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Readiness Score */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <TrendingUp className="w-5 h-5" />
            {roleContent.contentReadiness.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-900 mb-2">{getContentReadinessScore()}%</p>
            <p className="text-sm text-orange-700 mb-3">{roleContent.contentReadiness.subtitle}</p>
            <p className="text-xs text-orange-600 mb-3">{roleContent.contentReadiness.description}</p>
            <div>
              <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                {getContentReadinessScore() < 25 ? 'Rookie' :
                 getContentReadinessScore() < 50 ? 'Apprentice' :
                 getContentReadinessScore() < 75 ? 'Professional' : 'Master'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickStats;
