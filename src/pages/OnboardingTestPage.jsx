import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RefreshCw, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import googleCalendarService from '../services/googleCalendarService';
import { toast } from 'react-hot-toast';

const OnboardingTestPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState(null);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);

  useEffect(() => {
    checkCalendarStatus();
  }, []);

  const checkCalendarStatus = async () => {
    const connected = await googleCalendarService.isAuthenticated();
    setIsCalendarConnected(connected);
  };

  const handleDisconnectCalendar = async () => {
    setDisconnectingCalendar(true);
    try {
      await googleCalendarService.signOut();
      setIsCalendarConnected(false);
      toast.success('📅 Google Calendar disconnected!');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect calendar');
    } finally {
      setDisconnectingCalendar(false);
    }
  };

  const handleResetOnboarding = async () => {
    setResetting(true);
    setStatus(null);

    try {
      const userEmail = currentUser?.email;
      
      if (!userEmail) {
        throw new Error('No user email found');
      }

      console.log('🔄 Resetting onboarding for:', userEmail);

      // Try to get the employee document first
      const employee = await firestoreService.getEmployeeByEmail(userEmail);
      
      if (employee) {
        // Update existing employee document
        await firestoreService.updateEmployee(userEmail, {
          onboardingCompleted: false,
          onboardingCompletedDate: null
        });
      } else {
        // Create new employee document if it doesn't exist
        console.log('📝 Employee document not found, creating new one...');
        await firestoreService.addEmployee({
          email: userEmail,
          firstName: currentUser?.firstName || currentUser?.displayName?.split(' ')[0] || 'User',
          lastName: currentUser?.lastName || currentUser?.displayName?.split(' ').slice(1).join(' ') || '',
          position: currentUser?.position || 'Team Member',
          department: currentUser?.department || 'General',
          onboardingCompleted: false,
          onboardingCompletedDate: null
        });
      }

      setStatus('success');
      toast.success('✅ Onboarding status reset! Redirecting to onboarding...');

      // Redirect to onboarding page after 2 seconds
      setTimeout(() => {
        navigate('/onboarding');
      }, 2000);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      setStatus('error');
      toast.error(`❌ Failed to reset onboarding status: ${error.message}`);
    } finally {
      setResetting(false);
    }
  };

  // Only allow admin access
  if (currentUser?.email !== 'jrsschroeder@gmail.com') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-gray-600 dark:text-gray-400">
                This page is only accessible to administrators.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Onboarding Test Utility</h1>
                <p className="text-gray-600 dark:text-gray-400">Reset onboarding status for testing</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                <strong>⚠️ Testing Tool:</strong> This will reset the onboarding status for {currentUser?.email},
                allowing you to test the complete onboarding flow.
              </p>
            </div>

            {/* Calendar Connection Status */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar Status
              </h3>
              <div className="space-y-3">
                {isCalendarConnected ? (
                  <>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Calendar Connected</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      To test the full authorization flow, disconnect your calendar first.
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleDisconnectCalendar}
                      disabled={disconnectingCalendar}
                      className="w-full"
                    >
                      {disconnectingCalendar ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Disconnecting...
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4 mr-2" />
                          Disconnect Calendar
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Calendar Not Connected</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✅ Ready to test calendar authorization in onboarding!
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Reset Onboarding:</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Sets <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">onboardingCompleted</code> to <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">false</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Clears the completion date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Redirects you to the onboarding page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Creates employee document if needed</span>
                  </li>
                </ul>
              </div>

              {status === 'success' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">Success!</p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Onboarding status has been reset. Redirecting...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Failed to reset onboarding status. Check console for details.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleResetOnboarding}
                  disabled={resetting}
                  className="flex-1"
                >
                  {resetting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset Onboarding Status
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                After reset, log out and log back in to see the full onboarding experience,
                or click the button above to go directly to the onboarding page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingTestPage;

