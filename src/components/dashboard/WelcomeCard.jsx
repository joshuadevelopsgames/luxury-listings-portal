import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Target, Trophy, Users, TrendingUp, BookOpen, Shield, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const WelcomeCard = ({ user, overallProgress, currentRole, systemUptime, adminStats }) => {
  const navigate = useNavigate();
  // Use the user prop instead of currentUser
  const currentUser = user;
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleSpecificContent = () => {
    switch (currentRole) {
      case 'admin':
        return {
          title: 'System Administration',
          role: 'System Administrator — @luxury_listings',
          department: 'System Administration',
          journey: 'System Management & User Control',
          journeyDesc: 'Managing the Luxury Listings Portal and all user accounts',
          progressDesc: 'You have full access to all system features and user management capabilities.',
          motivationalMessage: (progress) => `You're managing a system with ${adminStats?.totalUsers || 0} users and ${adminStats?.pendingApprovals || 0} pending approvals. Keep the system running smoothly!`,
          readinessScore: (progress) => `System Status: ${systemUptime || '99.9%'} Uptime`,
          quickActions: [
            { text: 'User Management', icon: Users },
            { text: 'System Monitoring', icon: Shield }
          ]
        };
      case 'content_director':
        return {
          title: 'Content Leadership',
          role: 'Content Manager — @luxury_listings',
          department: 'Content & Creative',
          journey: 'Content Strategy Mastery',
          journeyDesc: 'Building your foundation in luxury real estate content excellence',
          progressDesc: 'You\'re {progress}% of the way to being fully ramped up on our content systems, style guide, and creative direction.',
          motivationalMessage: (progress) => {
            if (progress < 25) return "Great start! You're building the foundation for luxury real estate content excellence.";
            if (progress < 50) return "You're making excellent progress! Your content leadership skills are developing beautifully.";
            if (progress < 75) return "Almost there! You're becoming a true luxury content expert.";
            return "Outstanding! You're fully ramped up and ready to lead our content strategy.";
          },
          readinessScore: (progress) => {
            if (progress < 25) return "Content Rookie";
            if (progress < 50) return "Content Apprentice";
            if (progress < 75) return "Content Professional";
            return "Content Master";
          },
          quickActions: [
            { text: 'View Style Guide', icon: BookOpen },
            { text: 'Meet with Pankaj', icon: Users },
            { text: 'Review Competitors', icon: TrendingUp }
          ]
        };

      case 'social_media_manager':
        return {
          title: 'Social Media Excellence',
          role: 'Social Media Manager — @luxury_listings',
          department: 'Social Media & Marketing',
          journey: 'Social Media Mastery',
          journeyDesc: 'Building your foundation in luxury real estate social media strategy',
          progressDesc: 'You\'re {progress}% of the way to being fully ramped up on our social media systems, posting strategy, and engagement tactics.',
          motivationalMessage: (progress) => {
            if (progress < 25) return "Welcome to the team! You're starting your journey in luxury real estate social media excellence.";
            if (progress < 50) return "Great progress! Your social media skills are growing and you're learning our luxury brand voice.";
            if (progress < 75) return "Excellent work! You're becoming a skilled luxury social media professional.";
            return "Fantastic! You're fully equipped to manage our luxury real estate social media presence.";
          },
          readinessScore: (progress) => {
            if (progress < 25) return "Social Rookie";
            if (progress < 50) return "Social Apprentice";
            if (progress < 75) return "Social Professional";
            return "Social Media Master";
          },
          quickActions: [
            { text: 'Content Calendar', icon: Calendar, path: '/content-calendar' },
            { text: 'Brand Guidelines', icon: BookOpen },
            { text: 'Analytics Dashboard', icon: TrendingUp }
          ]
        };

      case 'hr_manager':
        return {
          title: 'HR Operations',
          role: 'HR Manager — @luxury_listings',
          department: 'Human Resources',
          journey: 'HR Operations',
          journeyDesc: 'Managing team operations, leave requests, and employee experience',
          progressDesc: 'You have 3 pending leave requests and 2 upcoming performance reviews this week.',
          motivationalMessage: (progress) => {
            return "Your team is running smoothly! Keep up the great work managing our people operations.";
          },
          readinessScore: (progress) => {
            return "Active Manager";
          },
          quickActions: [
            { text: 'HR Calendar', icon: Calendar, path: '/hr-calendar' },
            { text: 'Team Analytics', icon: TrendingUp, path: '/hr-analytics' },
            { text: 'Pending Leave Requests', icon: Users, path: '/hr-calendar' }
          ]
        };

      case 'sales_manager':
        return {
          title: 'Sales Excellence',
          role: 'Sales Manager — @luxury_listings',
          department: 'Sales & Business Development',
          journey: 'Sales Pipeline Mastery',
          journeyDesc: 'Building your foundation in luxury real estate sales management',
          progressDesc: 'You\'re {progress}% of the way to being fully ramped up on our CRM systems, sales processes, and client management.',
          motivationalMessage: (progress) => {
            if (progress < 25) return "Welcome to sales leadership! You're beginning your journey in luxury real estate sales.";
            if (progress < 50) return "Great progress! Your sales skills are developing and you're learning our CRM systems.";
            if (progress < 75) return "Excellent work! You're becoming a skilled sales professional.";
            return "Outstanding! You're fully equipped to lead our sales initiatives and drive revenue growth.";
          },
          readinessScore: (progress) => {
            if (progress < 25) return "Sales Rookie";
            if (progress < 50) return "Sales Apprentice";
            if (progress < 75) return "Sales Professional";
            return "Sales Master";
          },
          quickActions: [
            { text: 'CRM Dashboard', icon: TrendingUp },
            { text: 'Sales Pipeline', icon: Target },
            { text: 'Lead Management', icon: Users }
          ]
        };

      default:
        return {
          title: 'Professional Development',
          role: 'Team Member — @luxury_listings',
          department: 'General',
          journey: 'Professional Growth',
          journeyDesc: 'Building your foundation in luxury real estate',
          progressDesc: 'You\'re {progress}% of the way to being fully ramped up on our systems and processes.',
          motivationalMessage: (progress) => {
            if (progress < 25) return "Great start! You're building the foundation for success.";
            if (progress < 50) return "You're making excellent progress! Your skills are developing beautifully.";
            if (progress < 75) return "Almost there! You're becoming a true professional.";
            return "Outstanding! You're fully ramped up and ready to excel.";
          },
          readinessScore: (progress) => {
            if (progress < 25) return "Professional Rookie";
            if (progress < 50) return "Professional Apprentice";
            if (progress < 75) return "Professional";
            return "Professional Master";
          },
          quickActions: [
            { text: 'Company Handbook', icon: BookOpen },
            { text: 'Meet the Team', icon: Users },
            { text: 'Training Modules', icon: TrendingUp }
          ]
        };
    }
  };

  const roleContent = getRoleSpecificContent();

  // Handle quick action button clicks
  const handleQuickAction = (actionText) => {
    switch (actionText) {
      case 'User Management':
        navigate('/user-management');
        break;
      case 'System Monitoring':
        navigate('/analytics');
        break;
      case 'View Style Guide':
        navigate('/resources');
        break;
      case 'Meet with Pankaj':
        navigate('/team');
        break;
      case 'Review Competitors':
        navigate('/analytics');
        break;
      case 'Content Calendar':
        navigate('/content-calendar');
        break;
      case 'Brand Guidelines':
        navigate('/resources');
        break;
      case 'Analytics Dashboard':
        navigate('/analytics');
        break;
      case 'Team Directory':
        navigate('/team');
        break;
      case 'HR Policies':
        navigate('/resources');
        break;
      case 'Performance Reviews':
        navigate('/hr-analytics');
        break;
      case 'HR Calendar':
        navigate('/hr-calendar');
        break;
      case 'Team Analytics':
        navigate('/hr-analytics');
        break;
      case 'Pending Leave Requests':
        navigate('/hr-calendar');
        break;
      case 'CRM Dashboard':
        navigate('/crm');
        break;
      case 'Sales Pipeline':
        navigate('/sales-pipeline');
        break;
      case 'Lead Management':
        navigate('/leads');
        break;
      case 'Company Handbook':
        navigate('/resources');
        break;
      case 'Meet the Team':
        navigate('/team');
        break;
      case 'Training Modules':
        navigate('/tutorials');
        break;
      default:
        console.log('Action not implemented:', actionText);
        break;
    }
  };

  return (
    <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-none">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold mb-2">
              {getGreeting()}, {user?.firstName}! 👋
            </CardTitle>
            <p className="text-slate-200 text-lg leading-relaxed">
              {roleContent.motivationalMessage(overallProgress)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {roleContent.readinessScore(overallProgress)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Role Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">Role</span>
            </div>
            <p className="text-white font-semibold">{roleContent.role}</p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-slate-300">Department</span>
            </div>
            <p className="text-white font-semibold">{roleContent.department}</p>
          </div>
        </div>

        {/* Day Counter or HR-specific Status */}
        {currentRole !== 'hr_manager' ? (
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-slate-300">Onboarding Journey</span>
          </div>
          <p className="text-white font-semibold text-lg">
            Day 1 of {roleContent.journey}
          </p>
          <p className="text-slate-300 text-sm mt-1">
            {roleContent.journeyDesc}
          </p>
        </div>
        ) : (
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">{roleContent.journey}</span>
            </div>
            <p className="text-white font-semibold text-lg">
              Managing {adminStats?.totalUsers || 25} Team Members
            </p>
            <p className="text-slate-300 text-sm mt-1">
              {roleContent.journeyDesc}
            </p>
          </div>
        )}

        {/* Onboarding Progress or HR Status */}
        {currentRole !== 'hr_manager' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">{roleContent.title} Progress</span>
            <span className="text-white font-bold">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3 bg-white/20" />
          <p className="text-slate-200 text-sm leading-relaxed">
            {roleContent.progressDesc.replace('{progress}', overallProgress)}
          </p>
        </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Current Priorities</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded p-3">
                <p className="text-2xl font-bold text-white">3</p>
                <p className="text-xs text-slate-300">Pending Leave Requests</p>
              </div>
              <div className="bg-white/10 rounded p-3">
                <p className="text-2xl font-bold text-white">2</p>
                <p className="text-xs text-slate-300">Reviews This Week</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          {roleContent.quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button key={index} variant="outline" size="sm" className="border-white/30 text-black bg-white hover:bg-white/90" onClick={() => handleQuickAction(action.text)}>
                <Icon className="w-4 h-4 mr-2" />
                {action.text}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeCard;
