import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions, FEATURE_PERMISSIONS } from '../contexts/PermissionsContext';
import { modules } from '../modules/registry';
import {
  CheckCircle2,
  Calendar,
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Home,
  ChevronRight,
  User,
  Mail,
  Phone,
  Briefcase
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { googleCalendarService } from '../services/googleCalendarService';
import { toast } from 'react-hot-toast';

// Short "how to use" copy per module for onboarding
const MODULE_HOW_TO_USE = {
  'time-off': 'Request time off and see your balance. Approvers will get notified.',
  'my-clients': 'View your assigned clients, deliverables, and log posts. Your home base for client work.',
  'instagram-reports': 'Create and share Instagram analytics reports with clients.',
  'tasks': 'Manage your tasks, use filters and templates, and request tasks from teammates.',
  'clients': 'View and manage all clients, assign managers, and edit packages.',
  'posting-packages': 'See and manage posting packages for @luxury_listings.',
  'content-calendar': 'Plan and schedule content across channels.',
  'crm': 'Track leads and deals through the sales pipeline.',
  'team': 'Manage team members and roles.',
  'hr-calendar': 'View and approve team time off and leave requests.',
  'hr-analytics': 'See team analytics and insights.',
  'client-health': 'Review AI-powered client health and risk overview.',
  'it-support': 'Submit and track support tickets.',
  'resources': 'Access company docs and resources.',
  'features': 'Browse add-ons available to quote.',
  'workload': 'View team capacity and how clients are distributed.',
  'graphic-projects': 'Track graphic design projects and requests.'
};

const SECTION_ORDER = ['Main', 'SMM', 'Content Team', 'Design Team', 'Sales Team', 'HR', 'Admin', 'Resources'];

const OnboardingPage = () => {
  const { currentUser, userData, mergeCurrentUser } = useAuth();
  const { permissions, hasFeaturePermission, isSystemAdmin } = usePermissions();
  const canViewAllModules = hasFeaturePermission(FEATURE_PERMISSIONS.VIEW_ALL_MODULES);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [checkingCompleted, setCheckingCompleted] = useState(true);

  // Persistence: Firestore is source of truth. If user already completed onboarding, redirect to dashboard.
  useEffect(() => {
    if (!currentUser?.email) {
      setCheckingCompleted(false);
      return;
    }
    if (currentUser.onboardingCompleted === true) {
      navigate('/dashboard', { replace: true });
      return;
    }
    let cancelled = false;
    firestoreService.getApprovedUserByEmail(currentUser.email).then((approved) => {
      if (cancelled) return;
      if (approved?.onboardingCompleted === true) {
        mergeCurrentUser({ onboardingCompleted: true, onboardingCompletedDate: approved.onboardingCompletedDate });
        navigate('/dashboard', { replace: true });
      }
    }).finally(() => { if (!cancelled) setCheckingCompleted(false); });
    return () => { cancelled = true; };
  }, [currentUser?.email, currentUser?.onboardingCompleted, navigate, mergeCurrentUser]);

  const [profileData, setProfileData] = useState({
    firstName: userData?.firstName || currentUser?.firstName || '',
    lastName: userData?.lastName || currentUser?.lastName || '',
    email: currentUser?.email || '',
    phone: userData?.phone || '',
    city: userData?.city || '',
    state: userData?.state || '',
    zipCode: userData?.zipCode || ''
  });

  const onboardingModules = useMemo(() => {
    const ids = canViewAllModules ? Object.keys(modules) : (Array.isArray(permissions) ? permissions : []);
    return ids
      .filter((id) => modules[id] && modules[id].navItem)
      .map((id) => {
        const m = modules[id];
        const Icon = m.icon;
        return {
          id,
          name: m.name,
          description: m.description,
          icon: Icon,
          path: m.navItem.path,
          section: m.navItem.section,
          howTo: MODULE_HOW_TO_USE[id] || m.description
        };
      })
      .sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section));
  }, [permissions, canViewAllModules, isSystemAdmin]);

  useEffect(() => {
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = async () => {
    const connected = await googleCalendarService.isAuthenticated();
    setIsGoogleConnected(connected);
  };

  const handleConnectCalendar = async () => {
    setConnectingCalendar(true);
    try {
      if (!currentUser?.email) {
        toast.error('User email not available. Please log in again.');
        return;
      }
      
      await googleCalendarService.initialize(currentUser.email);
      setIsGoogleConnected(true);
      toast.success('📅 Google Calendar connected successfully!');
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast.error('Failed to connect Google Calendar. You can try again later.');
    } finally {
      setConnectingCalendar(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    console.log('🎯 Completing onboarding...');
    setCompleting(true);
    const authEmail = (currentUser?.email || '').trim();
    // Basic email validation to prevent Firestore permission errors with invalid emails
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!authEmail || !emailRegex.test(authEmail)) {
      toast.error('Invalid user email. Please log in again.');
      setCompleting(false);
      return;
    }
    const completedAt = new Date().toISOString();
    try {
      // 1. Persist onboarding state first (approved_users); use auth email as-is so Firestore rule matches
      await firestoreService.updateApprovedUser(authEmail, {
        onboardingCompleted: true,
        onboardingCompletedDate: completedAt
      });
      mergeCurrentUser({
        onboardingCompleted: true,
        onboardingCompletedDate: completedAt
      });

      // 2. Save profile/employee data; use auth email as-is so employees rule (resource.data.email == token) passes
      const employeeData = {
        ...profileData,
        email: authEmail,
        onboardingCompleted: true,
        onboardingCompletedDate: completedAt,
        position: userData?.position ?? currentUser?.position ?? '',
        department: userData?.department ?? currentUser?.department ?? '',
        startDate: userData?.startDate ?? currentUser?.startDate ?? new Date().toISOString(),
        roles: currentUser?.roles ?? userData?.roles ?? []
      };

      const existingEmployee = await firestoreService.getEmployeeByEmail(authEmail);
      if (existingEmployee) {
        await firestoreService.updateEmployee(existingEmployee.id, employeeData);
      } else {
        await firestoreService.addEmployee(employeeData);
      }

      toast.success('🎉 Welcome aboard! Let\'s get started!');
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      // Onboarding state may already be saved; only show error if we couldn't update approved_user
      toast.error('Failed to save onboarding progress. Trying to continue anyway...');
      mergeCurrentUser({
        onboardingCompleted: true,
        onboardingCompletedDate: completedAt
      });
      setTimeout(() => navigate('/dashboard'), 2000);
    } finally {
      setCompleting(false);
    }
  };

  const handleProfileInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSkip = async () => {
    console.log('⏭️ User skipping onboarding');
    await handleCompleteOnboarding();
  };

  const steps = [
    {
      id: 0,
      title: `Welcome, ${userData?.firstName || currentUser?.displayName?.split(' ')[0] || 'Team Member'}!`,
      description: 'Your workspace is ready. Next we\'ll show you what you have access to.',
      icon: Sparkles,
      content: (
        <div className="space-y-8">
          <div className="rounded-2xl bg-[#f5f5f7] dark:bg-[#1d1d1f] p-10 text-center">
            <div className="inline-flex h-20 w-20 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] items-center justify-center mb-6 shadow-lg shadow-[#0071e3]/20">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white mb-2">
              {(() => {
                const allRoles = (currentUser?.roles || userData?.roles || []).filter(r => r && r.toLowerCase() !== 'pending');
                const position = userData?.position || currentUser?.position;
                if (allRoles.length > 1) {
                  return `Your roles: ${allRoles.map(r => r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(' & ')}`;
                }
                if (position) return `Your role: ${position}`;
                if (allRoles.length === 1) return `Your role: ${allRoles[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
                return 'Team Member';
              })()}
            </h3>
            <p className="text-[15px] text-[#86868b] max-w-md mx-auto">
              You’ll see your tools in the sidebar. We’ll walk you through each one in the next step.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: 'Your workspace',
      description: 'Here’s what you have access to and how to use it.',
      icon: LayoutDashboard,
      content: (
        <div className="space-y-6">
          <p className="text-[15px] text-[#86868b]">
            These modules appear in your sidebar. Use them to manage your work and collaborate with the team.
          </p>
          {onboardingModules.length === 0 ? (
            <div className="rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e] p-8 text-center">
              <p className="text-[15px] text-[#86868b]">Your modules are still being set up. You can explore the Dashboard after finishing this setup.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {onboardingModules.map((mod, idx) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.id}
                    className="rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e] p-4 flex items-start space-x-4"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white mb-0.5">{mod.name}</h4>
                      <p className="text-[13px] text-[#86868b]">{mod.howTo}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )
    },
    {
      id: 2,
      title: 'Connect your Google Calendar',
      description: 'Integrate your calendar to see events and manage your schedule directly from the dashboard.',
      icon: Calendar,
      content: (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#f5f5f7] dark:bg-[#1d1d1f] p-8 text-center">
            <div className="inline-flex h-20 w-20 rounded-2xl bg-gradient-to-br from-[#db4437] to-[#f4b400] items-center justify-center mb-6 shadow-lg shadow-[#db4437]/20">
              <Calendar className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white mb-2">Google Calendar</h3>
            <p className="text-[15px] text-[#86868b] max-w-md mx-auto mb-6">
              Connect your Google Calendar to view your schedule and manage events within the app.
            </p>
            {isGoogleConnected ? (
              <div className="flex items-center justify-center gap-2 text-[#34c759] font-medium text-[15px]">
                <CheckCircle2 className="w-5 h-5" />
                <span>Connected</span>
              </div>
            ) : (
              <button
                onClick={handleConnectCalendar}
                disabled={connectingCalendar}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-[15px] font-medium rounded-xl shadow-sm text-white bg-[#0071e3] hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {connectingCalendar ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <img src="/google-icon.svg" alt="Google" className="w-5 h-5 mr-2" />
                )}
                Connect Google Calendar
              </button>
            )}
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Complete your profile',
      description: 'Help your team know you better by filling out your profile details.',
      icon: User,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-[13px] font-medium text-[#86868b] mb-1">First Name</label>
              <input
                type="text"
                id="firstName"
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none text-[15px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]"
                value={profileData.firstName}
                onChange={(e) => handleProfileInputChange('firstName', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-[13px] font-medium text-[#86868b] mb-1">Last Name</label>
              <input
                type="text"
                id="lastName"
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none text-[15px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]"
                value={profileData.lastName}
                onChange={(e) => handleProfileInputChange('lastName', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-[#86868b] mb-1">Email</label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none text-[15px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]"
              value={profileData.email}
              disabled
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-[13px] font-medium text-[#86868b] mb-1">Phone (Optional)</label>
            <input
              type="tel"
              id="phone"
              className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none text-[15px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]"
              value={profileData.phone}
              onChange={(e) => handleProfileInputChange('phone', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-[13px] font-medium text-[#86868b] mb-1">City (Optional)</label>
              <input
                type="text"
                id="city"
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none text-[15px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]"
                value={profileData.city}
                onChange={(e) => handleProfileInputChange('city', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-[13px] font-medium text-[#86868b] mb-1">State/Province (Optional)</label>
              <input
                type="text"
                id="state"
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none text-[15px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]"
                value={profileData.state}
                onChange={(e) => handleProfileInputChange('state', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="zipCode" className="block text-[13px] font-medium text-[#86868b] mb-1">Zip/Postal Code (Optional)</label>
              <input
                type="text"
                id="zipCode"
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-none text-[15px] text-[#1d1d1f] dark:text-white focus:ring-2 focus:ring-[#0071e3]"
                value={profileData.zipCode}
                onChange={(e) => handleProfileInputChange('zipCode', e.target.value)}
              />
            </div>
          </div>
        </div>
      )
    }
  ];

  if (checkingCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f5f7] dark:bg-[#1c1c1e]">
        <div className="text-center">
          <div className="inline-flex h-20 w-20 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] items-center justify-center mb-6 shadow-lg shadow-[#0071e3]/20">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-[#1d1d1f] dark:text-white mb-2">Loading your workspace...</h2>
          <p className="text-[15px] text-[#86868b]">Please wait a moment while we prepare your experience.</p>
        </div>
      </div>
    );
  }

  const currentStepContent = steps[currentStep];

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#1c1c1e] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl bg-white dark:bg-[#1d1d1f] rounded-3xl shadow-xl border border-black/5 dark:border-white/5 overflow-hidden flex flex-col lg:flex-row">
        {/* Left Sidebar (Steps) */}
        <div className="lg:w-1/3 bg-black/5 dark:bg-white/5 p-6 lg:p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white mb-6">Onboarding</h2>
            <ul className="space-y-4">
              {steps.map((step, index) => (
                <li key={step.id} className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === currentStep ? 'bg-[#0071e3]' : 'bg-[#86868b]'}`}>
                    {index + 1}
                  </div>
                  <span className={`text-[15px] font-medium ${index === currentStep ? 'text-[#1d1d1f] dark:text-white' : 'text-[#86868b]'}`}>{step.title}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 lg:mt-0">
            <p className="text-[13px] text-[#86868b]">Need help? Contact IT Support.</p>
          </div>
        </div>

        {/* Right Content (Current Step) */}
        <div className="lg:w-2/3 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] text-white mb-6 shadow-lg shadow-[#0071e3]/20">
              <currentStepContent.icon className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-semibold text-[#1d1d1f] dark:text-white mb-2">{currentStepContent.title}</h2>
            <p className="text-[17px] text-[#86868b] mb-8">{currentStepContent.description}</p>
            
            {currentStepContent.content}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-[15px] font-medium rounded-xl shadow-sm text-[#1d1d1f] dark:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Previous
              </button>
            )}
            {currentStep < steps.length - 1 && (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="ml-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-[15px] font-medium rounded-xl shadow-sm text-white bg-[#0071e3] hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] transition-colors"
              >
                Next
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            )}
            {currentStep === steps.length - 1 && (
              <button
                onClick={handleCompleteOnboarding}
                disabled={completing}
                className="ml-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-[15px] font-medium rounded-xl shadow-sm text-white bg-[#0071e3] hover:bg-[#0077ed] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0071e3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {completing ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Complete Onboarding'
                )}
              </button>
            )}
          </div>
          {currentStep < steps.length - 1 && (
            <div className="mt-4 text-center">
              <button
                onClick={handleSkip}
                className="text-[13px] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
