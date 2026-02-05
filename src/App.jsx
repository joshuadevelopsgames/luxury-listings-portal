import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PendingUsersProvider } from './contexts/PendingUsersContext';
import { ViewAsProvider } from './contexts/ViewAsContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { ClientsProvider } from './contexts/ClientsContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { Toaster } from 'react-hot-toast';
import { setNavigate } from './utils/navigation';
import MobileInstallPrompt from './components/MobileInstallPrompt';

// Admin utilities - expose to console for easy access
import { importClients } from './utils/importClientsFromSheet';
import { firestoreService } from './services/firestoreService';
if (typeof window !== 'undefined') {
  window.importClients = importClients;
  window.firestoreService = firestoreService; // For running migrations like assignMissingClientNumbers()
}

// V3 Components (Apple-styled design)
import V3Layout from './v3-app/components/Layout';
import V3Login from './v3-app/components/Login';
import V3Dashboard from './v3-app/components/Dashboard';
import PermissionRoute from './v3-app/components/PermissionRoute';
import PermissionsManager from './v3-app/pages/PermissionsManager';

// V3 Styles
import './v3-app/styles/globals.css';

// Pages (wrapped in V3 layout)
import TasksPage from './pages/TasksPage';
import ClientsPage from './pages/ClientsPage';
import PostingPackages from './pages/PostingPackages';
import ContentCalendar from './pages/ContentCalendar';
import CRMPage from './pages/CRMPage';
import TeamManagement from './pages/TeamManagement';
import HRCalendar from './pages/HRCalendar';
import HRAnalytics from './pages/HRAnalytics';
import ClientHealthPage from './pages/ClientHealthPage';
import ITSupportPage from './pages/ITSupportPage';
import TutorialsPage from './pages/TutorialsPage';
import ResourcesPage from './pages/ResourcesPage';
import FeaturesPage from './pages/FeaturesPage';
import MyTimeOff from './pages/MyTimeOff';
import EmployeeSelfService from './pages/EmployeeSelfService';
import OnboardingPage from './pages/OnboardingPage';
import ContentManagerMessage from './pages/ContentManagerMessage';
import AdminMessage from './pages/AdminMessage';
import DirectorMessage from './pages/DirectorMessage';
import SocialMediaManagerMessage from './pages/SocialMediaManagerMessage';
import GraphicDesignerMessage from './pages/GraphicDesignerMessage';
import HRManagerMessage from './pages/HRManagerMessage';
import SalesManagerMessage from './pages/SalesManagerMessage';
import InstagramReportsPage from './pages/InstagramReportsPage';
import MetaCallback from './pages/MetaCallback';
import WaitingForApproval from './pages/WaitingForApproval';
import ClientLogin from './pages/ClientLogin';
import ClientWaitingForApproval from './pages/ClientWaitingForApproval';
import ClientPasswordReset from './pages/ClientPasswordReset';
import FirebaseAuthHandler from './pages/FirebaseAuthHandler';
import PublicInstagramReportPage from './pages/PublicInstagramReportPage';
import DemoInstagramReportPage from './pages/DemoInstagramReportPage';
import NotificationsPage from './pages/NotificationsPage';
import WorkloadPage from './pages/WorkloadPage';
import SlackCallback from './pages/SlackCallback';
import GraphicProjectTracker from './pages/GraphicProjectTracker';

// Module Pages
import MyClientsPage from './modules/my-clients/pages/MyClientsPage';

// Field Service (Jobber replacement)
import FieldServiceLayout from './field-service-app/components/Layout';
import FieldServiceDashboard from './field-service-app/pages/Dashboard';
import FieldServiceSchedule from './field-service-app/pages/Schedule';
import FieldServiceClients from './field-service-app/pages/Clients';
import FieldServiceRequests from './field-service-app/pages/Requests';
import FieldServiceQuotes from './field-service-app/pages/Quotes';
import FieldServiceJobs from './field-service-app/pages/Jobs';
import FieldServiceInvoices from './field-service-app/pages/Invoices';
import FieldServiceMarketing from './field-service-app/pages/Marketing';
import FieldServiceTimesheets from './field-service-app/pages/Timesheets';
import FieldServiceApps from './field-service-app/pages/Apps';
import FieldServiceRefer from './field-service-app/pages/Refer';
import FieldServiceSettings from './field-service-app/pages/Settings';

// Error Handling
import { RouteErrorPage } from './components/ErrorBoundary';

// ============================================================================
// NAVIGATION HELPER - Sets up programmatic navigation
// ============================================================================
function NavigateSetter() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  return null;
}

// ============================================================================
// ROOT LAYOUT - Wraps all routes, sets up navigation
// ============================================================================
function RootLayout() {
  return (
    <>
      <NavigateSetter />
      <Outlet />
    </>
  );
}

// ============================================================================
// LOGIN PAGE - Shows login, redirects if already authenticated
// ============================================================================
function LoginPage() {
  const { currentUser, loading } = useAuth();

  // Show login page immediately (even while loading)
  // This prevents blank screen while auth initializes
  if (loading) {
    return <V3Login />;
  }

  // Already logged in - go to dashboard
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <V3Login />;
}

// ============================================================================
// FIELD SERVICE APP - Jobber replacement (requires auth)
// ============================================================================
function ProtectedFieldServiceApp() {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/login" replace />;
  return <FieldServiceLayout />;
}

// ============================================================================
// PROTECTED APP - Requires authentication
// ============================================================================
function ProtectedApp() {
  const { currentUser, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#86868b] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Logged in - show V3 layout with child routes
  return <V3Layout />;
}

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      // Public routes (no auth required)
      { path: '/login', element: <LoginPage /> },
      { path: '/client-login', element: <ClientLogin /> },
      { path: '/client-password-reset', element: <ClientPasswordReset /> },
      { path: '/client-waiting-for-approval', element: <ClientWaitingForApproval /> },
      { path: '/waiting-for-approval', element: <WaitingForApproval /> },
      { path: '/__/auth/action', element: <FirebaseAuthHandler /> },
      
      // Public Instagram reports
      { path: '/report/:publicLinkId', element: <PublicInstagramReportPage /> },
      { path: '/report-demo', element: <DemoInstagramReportPage /> },
      
      // OAuth callbacks
      { path: '/slack-callback', element: <SlackCallback /> },

      // Field Service app (Jobber replacement)
      {
        path: '/field-service',
        element: <ProtectedFieldServiceApp />,
        children: [
          { index: true, element: <Navigate to="/field-service/dashboard" replace /> },
          { path: 'dashboard', element: <FieldServiceDashboard /> },
          { path: 'schedule', element: <FieldServiceSchedule /> },
          { path: 'clients', element: <FieldServiceClients /> },
          { path: 'requests', element: <FieldServiceRequests /> },
          { path: 'quotes', element: <FieldServiceQuotes /> },
          { path: 'jobs', element: <FieldServiceJobs /> },
          { path: 'invoices', element: <FieldServiceInvoices /> },
          { path: 'marketing', element: <FieldServiceMarketing /> },
          { path: 'timesheets', element: <FieldServiceTimesheets /> },
          { path: 'apps', element: <FieldServiceApps /> },
          { path: 'refer', element: <FieldServiceRefer /> },
          { path: 'settings', element: <FieldServiceSettings /> },
          { path: '*', element: <Navigate to="/field-service/dashboard" replace /> },
        ],
      },

      // Protected app routes (requires auth)
      {
        path: '/',
        element: <ProtectedApp />,
        children: [
          // Dashboard - default route
          { index: true, element: <V3Dashboard /> },
          { path: 'dashboard', element: <V3Dashboard /> },

          // Permission-protected pages
          { path: 'tasks', element: <PermissionRoute pageId="tasks" pageName="Tasks"><TasksPage /></PermissionRoute> },
          { path: 'my-clients', element: <PermissionRoute pageId="my-clients" pageName="My Clients"><MyClientsPage /></PermissionRoute> },
          { path: 'clients', element: <PermissionRoute pageId="clients" pageName="Client Management"><ClientsPage /></PermissionRoute> },
          { path: 'posting-packages', element: <PermissionRoute pageId="posting-packages" pageName="Posting Packages"><PostingPackages /></PermissionRoute> },
          { path: 'pending-clients', element: <Navigate to="/clients?tab=pending" replace /> },
          { path: 'content-calendar', element: <PermissionRoute pageId="content-calendar" pageName="Content Calendar"><ContentCalendar /></PermissionRoute> },
          { path: 'crm', element: <PermissionRoute pageId="crm" pageName="CRM"><CRMPage /></PermissionRoute> },
          { path: 'team', element: <PermissionRoute pageId="team" pageName="Team Management"><TeamManagement /></PermissionRoute> },
          { path: 'hr-calendar', element: <PermissionRoute pageId="hr-calendar" pageName="HR Calendar"><HRCalendar /></PermissionRoute> },
          { path: 'hr-analytics', element: <PermissionRoute pageId="hr-analytics" pageName="HR Analytics"><HRAnalytics /></PermissionRoute> },
          { path: 'client-health', element: <PermissionRoute pageId="client-health" pageName="Client Health"><ClientHealthPage /></PermissionRoute> },
          { path: 'it-support', element: <PermissionRoute pageId="it-support" pageName="IT Support"><ITSupportPage /></PermissionRoute> },
          { path: 'tutorials', element: <PermissionRoute pageId="tutorials" pageName="Tutorials"><TutorialsPage /></PermissionRoute> },
          { path: 'resources', element: <PermissionRoute pageId="resources" pageName="Resources"><ResourcesPage /></PermissionRoute> },
          { path: 'features', element: <PermissionRoute pageId="features" pageName="Add ons"><FeaturesPage /></PermissionRoute> },
          { path: 'workload', element: <PermissionRoute pageId="workload" pageName="Team Workload"><WorkloadPage /></PermissionRoute> },
          { path: 'graphic-projects', element: <PermissionRoute pageId="graphic-projects" pageName="Team Projects"><GraphicProjectTracker /></PermissionRoute> },

          // Admin pages - system admin only

          // Profile pages - always accessible when logged in
          { path: 'my-time-off', element: <MyTimeOff /> },
          { path: 'self-service', element: <EmployeeSelfService /> },
          { path: 'onboarding', element: <OnboardingPage /> },
          { path: 'content-manager-message', element: <ContentManagerMessage /> },
          { path: 'admin-message', element: <AdminMessage /> },
          { path: 'director-message', element: <DirectorMessage /> },
          { path: 'social-media-manager-message', element: <SocialMediaManagerMessage /> },
          { path: 'graphic-designer-message', element: <GraphicDesignerMessage /> },
          { path: 'hr-manager-message', element: <HRManagerMessage /> },
          { path: 'sales-manager-message', element: <SalesManagerMessage /> },
          { path: 'notifications', element: <NotificationsPage /> },

          // Admin pages
          { path: 'permissions', element: <PermissionsManager /> },
          { path: 'instagram-reports', element: <InstagramReportsPage /> },

          // Meta OAuth callback
          { path: 'meta-callback', element: <MetaCallback /> },

          // Catch-all - redirect to dashboard
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
]);

// ============================================================================
// APP - Main entry point with all providers
// ============================================================================
function App() {
  return (
    <PendingUsersProvider>
      <AuthProvider>
        <PermissionsProvider>
          <ClientsProvider>
            <ViewAsProvider>
              <ConfirmProvider>
                <RouterProvider router={router} />
                <MobileInstallPrompt />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 3000,
                    style: {
                      background: '#333',
                      color: '#fff',
                      borderRadius: '8px',
                    },
                    success: {
                      iconTheme: { primary: '#22c55e', secondary: '#fff' },
                    },
                    error: {
                      iconTheme: { primary: '#ef4444', secondary: '#fff' },
                    },
                  }}
                />
              </ConfirmProvider>
            </ViewAsProvider>
          </ClientsProvider>
        </PermissionsProvider>
      </AuthProvider>
    </PendingUsersProvider>
  );
}

export default App;
