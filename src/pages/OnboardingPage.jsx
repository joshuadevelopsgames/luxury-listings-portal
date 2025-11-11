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
  ChevronRight
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import googleCalendarService from '../services/googleCalendarService';
import { toast } from 'react-hot-toast';

const OnboardingPage = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);

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
      await googleCalendarService.initialize();
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
    setCompleting(true);
    try {
      // Mark onboarding as completed in Firestore
      await firestoreService.updateEmployee(currentUser.email, {
        onboardingCompleted: true,
        onboardingCompletedDate: new Date().toISOString()
      });

      toast.success('🎉 Welcome aboard! Let\'s get started!');
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to save onboarding progress');
      setCompleting(false);
    }
  };

  const handleSkip = async () => {
    await handleCompleteOnboarding();
  };

  const steps = [
    {
      id: 0,
      title: `Welcome to Luxury Listings, ${userData?.firstName || 'Team Member'}! 👋`,
      description: 'We\'re excited to have you join the team. Let\'s take a quick tour of your new workspace.',
      icon: Sparkles,
      content: (
        <div className="space-y-6">
          <div className="rounded-lg p-6 border border-indigo-500" style={{ backgroundColor: '#6366f1' }}>
            <h3 className="text-lg font-semibold mb-3 text-white">
              Your Role: {userData?.position || 'Team Member'}
            </h3>
            <p className="text-white/90">
              As a <span className="font-semibold text-white">{userData?.position || 'team member'}</span>, you'll have access to personalized tools and features designed specifically for your role.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-gray-600 dark:text-gray-400">
              This quick setup will help you:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Understand the key features available to you</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Connect your Google Calendar for team collaboration</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Get familiar with your personalized dashboard</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: 'Your Platform Features',
      description: 'Here\'s what you can do in the Luxury Listings Portal',
      icon: LayoutDashboard,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-semibold">Dashboard</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your personalized hub with quick stats, recent activity, and important updates
            </p>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-green-500 dark:hover:border-green-400 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                <ListTodo className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-semibold">Daily Tasks</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your tasks, collaborate with teammates, and track your progress
            </p>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-semibold">Resources & Training</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Access tutorials, time-off requests, and helpful resources
            </p>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-orange-500 dark:hover:border-orange-400 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-semibold">Calendar & Events</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View team events, schedule meetings, and manage your availability
            </p>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-semibold">My Profile</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Update your information, manage settings, and personalize your experience
            </p>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-red-500 dark:hover:border-red-400 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-red-500 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-semibold">IT Support</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get help with technical issues, report bugs, and submit support requests
            </p>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'Connect Your Google Calendar',
      description: 'Stay in sync with team meetings and events',
      icon: Calendar,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-orange-950 dark:text-orange-50">
                  Why connect your calendar?
                </h3>
                <ul className="space-y-2 text-sm text-gray-900 dark:text-gray-100">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-orange-700 flex-shrink-0" />
                    <span>See all team meetings and events in one place</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-orange-700 flex-shrink-0" />
                    <span>Never miss important deadlines or check-ins</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-orange-700 flex-shrink-0" />
                    <span>Book meetings with team members easily</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-orange-700 flex-shrink-0" />
                    <span>Your calendar data stays private and secure</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            {isGoogleConnected ? (
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Calendar Connected! ✅</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You're all set to view team events and schedule meetings
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Connect Google Calendar</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Click below to authorize calendar access
                  </p>
                  <Button
                    onClick={handleConnectCalendar}
                    disabled={connectingCalendar}
                    className="mx-auto"
                  >
                    {connectingCalendar ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Connect Calendar
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                    You can always connect later from your calendar page
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-950 dark:text-blue-50">
              <strong>🔒 Privacy Note:</strong> We only access your calendar to show you team events. 
              We never modify your calendar or share your personal events without permission.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'You\'re All Set! 🎉',
      description: 'Ready to start your journey with Luxury Listings',
      icon: CheckCircle2,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-8 border border-green-200 dark:border-green-800 text-center">
            <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-green-900 dark:text-green-100">
              Welcome Aboard!
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              You're ready to explore your personalized workspace
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Quick Tips to Get Started:</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">1</span>
                </div>
                <div>
                  <p className="font-medium">Check your Dashboard</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Start with the dashboard to see your tasks and updates
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">2</span>
                </div>
                <div>
                  <p className="font-medium">Complete your profile</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Visit "My Profile" to update your contact information
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">3</span>
                </div>
                <div>
                  <p className="font-medium">Explore the Resources page</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Find tutorials, request time off, and access helpful tools
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">4</span>
                </div>
                <div>
                  <p className="font-medium">Need help?</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use the AI assistant (bottom right) or visit IT Support anytime
                  </p>
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
                  className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
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

