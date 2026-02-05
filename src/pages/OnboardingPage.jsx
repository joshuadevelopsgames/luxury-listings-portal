import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
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
  MapPin,
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
  'posting-packages': 'See posting packages and use the Posts Today tally to log completed posts.',
  'content-calendar': 'Plan and schedule content across channels.',
  'crm': 'Track leads and deals through the sales pipeline.',
  'team': 'Manage team members and roles.',
  'hr-calendar': 'View and approve team time off and leave requests.',
  'hr-analytics': 'See team analytics and insights.',
  'client-health': 'Review AI-powered client health and risk overview.',
  'it-support': 'Submit and track support tickets.',
  'tutorials': 'Work through step-by-step guides and training.',
  'resources': 'Access company docs and resources.',
  'features': 'Browse add-ons available to quote.',
  'workload': 'View team capacity and how clients are distributed.',
  'graphic-projects': 'Track graphic design projects and requests.'
};

const SECTION_ORDER = ['Main', 'SMM', 'Content Team', 'Design Team', 'Sales Team', 'HR', 'Admin', 'Resources'];

const OnboardingPage = () => {
  const { currentUser, userData } = useAuth();
  const { permissions, isSystemAdmin } = usePermissions();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: userData?.firstName || currentUser?.firstName || '',
    lastName: userData?.lastName || currentUser?.lastName || '',
    email: currentUser?.email || '',
    phone: userData?.phone || '',
    address: userData?.address || '',
    city: userData?.city || '',
    state: userData?.state || '',
    zipCode: userData?.zipCode || '',
    emergencyContactName: userData?.emergencyContactName || '',
    emergencyContactPhone: userData?.emergencyContactPhone || '',
    emergencyContactRelation: userData?.emergencyContactRelation || ''
  });

  const onboardingModules = useMemo(() => {
    const ids = isSystemAdmin ? Object.keys(modules) : (Array.isArray(permissions) ? permissions : []);
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
  }, [permissions, isSystemAdmin]);

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
    try {
      // Save profile data and mark onboarding as completed
      const employeeData = {
        ...profileData,
        onboardingCompleted: true,
        onboardingCompletedDate: new Date().toISOString(),
        position: userData?.position || currentUser?.position,
        department: userData?.department || currentUser?.department,
        startDate: userData?.startDate || currentUser?.startDate || new Date().toISOString(),
        roles: currentUser?.roles || userData?.roles || []
      };

      console.log('💾 Saving employee data:', employeeData);

      // Check if employee exists, if not create new one
      const existingEmployee = await firestoreService.getEmployeeByEmail(currentUser.email);
      
      if (existingEmployee) {
        console.log('✏️ Updating existing employee:', existingEmployee.id);
        await firestoreService.updateEmployee(existingEmployee.id, employeeData);
      } else {
        console.log('➕ Creating new employee');
        await firestoreService.addEmployee(employeeData);
      }

      await firestoreService.updateApprovedUser(currentUser.email, {
        onboardingCompleted: true,
        onboardingCompletedDate: employeeData.onboardingCompletedDate
      });

      console.log('✅ Employee data saved successfully');
      toast.success('🎉 Welcome aboard! Let\'s get started!');
      
      // Navigate to dashboard immediately
      console.log('🏠 Navigating to dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      toast.error('Failed to save onboarding progress. Trying to continue anyway...');
      
      // Navigate anyway even if there's an error
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
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
      title: `Welcome, ${userData?.firstName || currentUser?.displayName?.split(' ')[0] || 'Team Member'}`,
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
                    className="rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-transparent dark:border-white/10 p-5 hover:bg-[#ebebed] dark:hover:bg-[#3a3a3c] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-white dark:bg-white/10 shadow-sm flex items-center justify-center">
                        <Icon className="h-6 w-6 text-[#0071e3]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[#1d1d1f] dark:text-white text-[15px] mb-1">{mod.name}</h4>
                        <p className="text-[13px] text-[#86868b] leading-snug">{mod.howTo}</p>
                        <p className="text-[11px] text-[#86868b] mt-2">Sidebar → {mod.section}</p>
                      </div>
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
      title: 'Complete Your Profile',
      description: 'Tell us a bit about yourself',
      icon: User,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Why complete your profile?</h3>
                <p className="text-sm text-white/90">
                  Help your team get to know you better and ensure we have the right contact information for important updates.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200">
              <User className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-lg text-gray-800">Personal Information</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  First Name *
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => handleProfileInputChange('firstName', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="John"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Last Name *
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => handleProfileInputChange('lastName', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="inline w-4 h-4 mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleProfileInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                Address
              </label>
              <input
                type="text"
                value={profileData.address}
                onChange={(e) => handleProfileInputChange('address', e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => handleProfileInputChange('city', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="Vancouver"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Province
                </label>
                <input
                  type="text"
                  value={profileData.state}
                  onChange={(e) => handleProfileInputChange('state', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="BC"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={profileData.zipCode}
                  onChange={(e) => handleProfileInputChange('zipCode', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="V6B 2W9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200 pt-4">
              <Phone className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-lg text-gray-800">Emergency Contact</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={profileData.emergencyContactName}
                  onChange={(e) => handleProfileInputChange('emergencyContactName', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={profileData.emergencyContactPhone}
                  onChange={(e) => handleProfileInputChange('emergencyContactPhone', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="(555) 987-6543"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Relationship
                </label>
                <input
                  type="text"
                  value={profileData.emergencyContactRelation}
                  onChange={(e) => handleProfileInputChange('emergencyContactRelation', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  placeholder="Spouse, Parent, etc."
                />
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Tip:</strong> You can update this information anytime from your profile page.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Connect Your Google Calendar',
      description: 'Stay in sync with team meetings and events',
      icon: Calendar,
      content: (
        <div className="space-y-8">
          {/* Benefits Section */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500 p-8 shadow-xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-4 text-white drop-shadow-lg">
                    Why connect your calendar? 📅
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                      <span className="text-white font-medium text-sm">See all team meetings in one place</span>
                    </div>
                    <div className="flex items-start gap-3 bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                      <span className="text-white font-medium text-sm">Never miss important deadlines</span>
                    </div>
                    <div className="flex items-start gap-3 bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                      <span className="text-white font-medium text-sm">Book meetings easily</span>
                    </div>
                    <div className="flex items-start gap-3 bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                      <span className="text-white font-medium text-sm">Your data stays private & secure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Card */}
          {isGoogleConnected ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-10 text-center shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5"></div>
              <div className="relative space-y-4">
                <div className="inline-flex h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center mx-auto shadow-lg animate-pulse">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Calendar Connected! ✅</h4>
                  <p className="text-gray-600">
                    You're all set to view team events and schedule meetings
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-10 text-center shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5"></div>
              <div className="relative space-y-5">
                <div className="inline-flex h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center mx-auto shadow-lg">
                  <Calendar className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Connect Google Calendar</h4>
                  <p className="text-gray-600 mb-6">
                    Click below to authorize calendar access
                  </p>
                  <button
                    onClick={handleConnectCalendar}
                    disabled={connectingCalendar}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#0071e3] to-[#5856d6] text-white text-[15px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
                  >
                    {connectingCalendar ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-5 w-5" />
                        Connect Calendar
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-4">
                    You can always connect later from your calendar page
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 p-5 shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                <span className="text-lg">🔒</span>
              </div>
              <div>
                <p className="text-sm text-gray-800">
                  <strong className="text-indigo-700">Privacy Note:</strong> We only access your calendar to show you team events. 
                  We never modify your calendar or share your personal events without permission.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: 'You\'re All Set! 🎉',
      description: 'Ready to start your journey with Luxury Listings',
      icon: CheckCircle2,
      content: (
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-12 text-center shadow-xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
              <div className="inline-flex h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm items-center justify-center mx-auto mb-6 animate-bounce">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-3 text-white drop-shadow-lg">
                Welcome Aboard! 🎉
              </h3>
              <p className="text-lg text-white/90 max-w-md mx-auto">
                You're all set to explore your personalized workspace
              </p>
            </div>
          </div>

          {/* Quick Tips Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
              <h4 className="font-bold text-xl text-gray-800">Quick Tips to Get Started</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-indigo-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Check your Dashboard</p>
                    <p className="text-sm text-gray-600">
                      Start with the dashboard to see your tasks and updates
                    </p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Complete your profile</p>
                    <p className="text-sm text-gray-600">
                      Visit "My Profile" to update your contact information
                    </p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 hover:border-emerald-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Explore the Resources page</p>
                    <p className="text-sm text-gray-600">
                      Find tutorials, request time off, and access helpful tools
                    </p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">4</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Need help?</p>
                    <p className="text-sm text-gray-600">
                      Use the AI assistant (bottom right) or visit IT Support anytime
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f7] to-white dark:from-[#1d1d1f] dark:to-[#0a0a0a] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-medium text-[#86868b]">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-[13px] font-medium text-[#86868b]">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#0071e3] to-[#5856d6] transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xl overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center flex-shrink-0">
                <StepIcon className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mb-1">{currentStepData.title}</h1>
                <p className="text-[14px] text-[#86868b]">{currentStepData.description}</p>
              </div>
            </div>
          </div>

          <div className="p-6 pt-4">
            {currentStepData.content}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-black/5 dark:border-white/10">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="flex items-center gap-2">
                {/* Step Indicators */}
                <div className="flex items-center gap-2">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'bg-[#0071e3] w-8'
                          : index < currentStep
                          ? 'bg-[#0071e3]/40 w-2'
                          : 'bg-black/10 dark:bg-white/10 w-2'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleCompleteOnboarding}
                  disabled={completing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5856d6] via-[#af52de] to-[#ff2d55] text-white text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
                >
                  {completing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Finishing...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <Home className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Skip Option */}
            {currentStep < steps.length - 1 && (
              <div className="text-center mt-4">
                <button
                  onClick={handleSkip}
                  className="text-[13px] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white underline"
                >
                  Skip onboarding for now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-[13px] text-[#86868b] mt-6">
          Questions? Click the AI assistant icon in the bottom right corner anytime! 💬
        </p>
      </div>
    </div>
  );
};

export default OnboardingPage;

