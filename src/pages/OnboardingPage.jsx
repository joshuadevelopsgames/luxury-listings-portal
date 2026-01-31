import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  CheckCircle2, 
  Calendar, 
  LayoutDashboard, 
  ListTodo, 
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

const OnboardingPage = () => {
  const { currentUser, userData } = useAuth();
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
      title: `Welcome to Luxury Listings, ${userData?.firstName || 'Team Member'}! 👋`,
      description: 'We\'re excited to have you join the team. Let\'s take a quick tour of your new workspace.',
      icon: Sparkles,
      content: (
        <div className="space-y-8">
          {/* Role Hero Section */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-8 shadow-xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 text-white drop-shadow-lg">
              {(() => {
                // Get all roles the user has access to (not just the currently switched one)
                const allRoles = (currentUser?.roles || userData?.roles || [])
                  .filter(role => role && role.toLowerCase() !== 'pending'); // Filter out 'pending' status
                const position = userData?.position || currentUser?.position;
                
                if (allRoles.length > 1) {
                  const roleNames = allRoles.map(role => 
                    role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  );
                  return `Your Roles: ${roleNames.join(' & ')}`;
                } else if (position) {
                  return `Your Role: ${position}`;
                } else if (allRoles.length === 1) {
                  return `Your Role: ${allRoles[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
                } else {
                  return 'Your Role: Team Member';
                }
              })()}
            </h3>
            <p className="text-white/90 text-lg">
              {(() => {
                // Get all roles the user has access to (not just the currently switched one)
                const allRoles = (currentUser?.roles || userData?.roles || [])
                  .filter(role => role && role.toLowerCase() !== 'pending'); // Filter out 'pending' status
                const position = (userData?.position || currentUser?.position || '').toLowerCase();
                const rolesList = allRoles.map(r => r.toLowerCase());
                
                // Build description based on all roles
                const responsibilities = [];
                
                if (rolesList.some(r => r.includes('content_director')) || position.includes('content director')) {
                  responsibilities.push("manage content strategy and oversee campaigns");
                }
                if (rolesList.some(r => r.includes('social_media_manager')) || position.includes('social media manager')) {
                  responsibilities.push("create content and manage social media");
                }
                if (rolesList.some(r => r.includes('hr_manager')) || position.includes('hr manager')) {
                  responsibilities.push("handle HR operations and team management");
                }
                if (rolesList.some(r => r.includes('admin')) || position.includes('admin')) {
                  responsibilities.push("manage users and system settings");
                }
                if (rolesList.some(r => r.includes('sales')) || position.includes('sales')) {
                  responsibilities.push("manage leads and close deals");
                }
                
                if (responsibilities.length > 1) {
                  return `With your multiple roles, you'll ${responsibilities.slice(0, -1).join(', ')}, and ${responsibilities[responsibilities.length - 1]}.`;
                } else if (responsibilities.length === 1) {
                  if (position.includes('content director')) {
                    return "As Content Director, you'll manage content strategy, oversee campaigns, approve deliverables, and guide the creative team.";
                  } else if (position.includes('social media manager')) {
                    return "As Social Media Manager, you'll create and schedule posts, manage client packages, track engagement, and maintain the content calendar.";
                  } else if (position.includes('hr manager')) {
                    return "As HR Manager, you'll handle leave requests, manage team operations, track employee performance, and maintain team satisfaction.";
                  } else if (position.includes('admin')) {
                    return "As Administrator, you have full access to manage users, oversee all operations, handle support tickets, and configure system settings.";
                  } else if (position.includes('sales')) {
                    return "As part of the Sales team, you'll manage leads, track deals through the pipeline, maintain client relationships, and close new business.";
                  } else {
                    return `You'll ${responsibilities[0]}.`;
                  }
                } else {
                  return `As a ${position || 'team member'}, you'll have access to personalized tools and features designed specifically for your role.`;
                }
              })()}
            </p>
                </div>
              </div>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
              <h4 className="font-bold text-xl text-gray-800">This quick setup will help you:</h4>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 hover:border-emerald-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Understand the key features available to you</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-indigo-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Connect your Google Calendar for team collaboration</p>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Get familiar with your personalized dashboard</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 1,
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
      id: 2,
      title: 'Your Platform Features',
      description: 'Here\'s what you can do in the Luxury Listings Portal',
      icon: LayoutDashboard,
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
            <h4 className="font-bold text-xl text-gray-800">Explore Your Tools</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-indigo-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <LayoutDashboard className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2">Dashboard</h4>
                  <p className="text-sm text-gray-600">
                    Your personalized hub with quick stats, recent activity, and important updates
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 hover:border-emerald-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <ListTodo className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Daily Tasks</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Manage your tasks, collaborate with teammates, and track your progress
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2">Resources & Training</h4>
                  <p className="text-sm text-gray-600">
                    Access tutorials, time-off requests, and helpful resources
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2">Calendar & Events</h4>
                  <p className="text-sm text-gray-600">
                    View team events, schedule meetings, and manage your availability
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-cyan-50 to-sky-50 border-2 border-cyan-200 hover:border-cyan-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2">My Profile</h4>
                  <p className="text-sm text-gray-600">
                    Update your information, manage settings, and personalize your experience
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-200 hover:border-rose-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2">IT Support</h4>
                  <p className="text-sm text-gray-600">
                    Get help with technical issues, report bugs, and submit support requests
                  </p>
                </div>
              </div>
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
                  <Button
                    onClick={handleConnectCalendar}
                    disabled={connectingCalendar}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg text-lg px-8 py-6 h-auto"
                  >
                    {connectingCalendar ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-5 w-5 mr-2" />
                        Connect Calendar
                      </>
                    )}
                  </Button>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <StepIcon className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">{currentStepData.title}</h1>
                <p className="text-gray-600 dark:text-gray-400">{currentStepData.description}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {currentStepData.content}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {/* Step Indicators */}
                <div className="flex items-center gap-2">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`h-2 w-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'bg-blue-500 w-8'
                          : index < currentStep
                          ? 'bg-blue-300 dark:bg-blue-700'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCompleteOnboarding}
                  disabled={completing}
                  className="gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 shadow-lg"
                >
                  {completing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Finishing...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <Home className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Skip Option */}
            {currentStep < steps.length - 1 && (
              <div className="text-center mt-4">
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                >
                  Skip onboarding for now
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Questions? Click the AI assistant icon in the bottom right corner anytime! 💬
        </p>
      </div>
    </div>
  );
};

export default OnboardingPage;

