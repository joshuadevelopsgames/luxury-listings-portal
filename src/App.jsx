import React, { useEffect, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PendingUsersProvider } from './contexts/PendingUsersContext';
import { ViewAsProvider } from './contexts/ViewAsContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { CustomLocationsProvider } from './contexts/CustomLocationsContext';
import { ClientsProvider } from './contexts/ClientsContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { Toaster } from 'react-hot-toast';
import { setNavigate } from './utils/navigation';
import { useAnalyticsTracker } from './utils/analyticsTracker';
import MobileInstallPrompt from './components/MobileInstallPrompt';
import NewVersionNotifier from './components/NewVersionNotifier';

// Admin utilities - expose to console for easy access
import { importClients } from './utils/importClientsFromSheet';
import { firestoreService } from './services/firestoreService';

// ── Always-needed (critical path) ────────────────────────────────────────────
import V3Layout from './v3-app/components/Layout';
import V3Login from './v3-app/components/Login';
import PermissionRoute from './v3-app/components/PermissionRoute';
import { RouteErrorPage } from './components/ErrorBoundary';
import './v3-app/styles/globals.css';

// ── Lazy-loaded pages (split into separate chunks) ────────────────────────────
const V3Dashboard             = React.lazy(() => import('./v3-app/components/Dashboard'));
const PermissionsManager      = React.lazy(() => import('./v3-app/pages/PermissionsManager'));
const AnnouncementManager     = React.lazy(() => import('./v3-app/pages/AnnouncementManager'));

const TasksPage               = React.lazy(() => import('./pages/TasksPage'));
const ClientsPage             = React.lazy(() => import('./pages/ClientsPage'));
const PostingPackages         = React.lazy(() => import('./pages/PostingPackages'));
const ContentCalendar         = React.lazy(() => import('./pages/ContentCalendar'));
const ContentCalendarPostDue  = React.lazy(() => import('./pages/ContentCalendarPostDue'));
const CRMPage                 = React.lazy(() => import('./pages/CRMPage'));
const TeamManagement          = React.lazy(() => import('./pages/TeamManagement'));
const HRCalendar              = React.lazy(() => import('./pages/HRCalendar'));
const HRAnalytics             = React.lazy(() => import('./pages/HRAnalytics'));
const ClientHealthPage        = React.lazy(() => import('./pages/ClientHealthPage'));
const ITSupportPage           = React.lazy(() => import('./pages/ITSupportPage'));
const FeedbackSupportPage     = React.lazy(() => import('./pages/FeedbackSupportPage'));
const ResourcesPage           = React.lazy(() => import('./pages/ResourcesPage'));
const FeaturesPage            = React.lazy(() => import('./pages/FeaturesPage'));
const MyTimeOff               = React.lazy(() => import('./pages/MyTimeOff'));
const EmployeeSelfService     = React.lazy(() => import('./pages/EmployeeSelfService'));
const OnboardingPage          = React.lazy(() => import('./pages/OnboardingPage'));
const ContentManagerMessage   = React.lazy(() => import('./pages/ContentManagerMessage'));
const AdminMessage            = React.lazy(() => import('./pages/AdminMessage'));
const DirectorMessage         = React.lazy(() => import('./pages/DirectorMessage'));
const SocialMediaManagerMessage = React.lazy(() => import('./pages/SocialMediaManagerMessage'));
const GraphicDesignerMessage  = React.lazy(() => import('./pages/GraphicDesignerMessage'));
const HRManagerMessage        = React.lazy(() => import('./pages/HRManagerMessage'));
const SalesManagerMessage     = React.lazy(() => import('./pages/SalesManagerMessage'));
const InstagramReportsPage    = React.lazy(() => import('./pages/InstagramReportsPage'));
const MetaCallback            = React.lazy(() => import('./pages/MetaCallback'));
const WaitingForApproval      = React.lazy(() => import('./pages/WaitingForApproval'));
const ClientLogin             = React.lazy(() => import('./pages/ClientLogin'));
const ClientWaitingForApproval = React.lazy(() => import('./pages/ClientWaitingForApproval'));
const ClientPasswordReset     = React.lazy(() => import('./pages/ClientPasswordReset'));
const FirebaseAuthHandler     = React.lazy(() => import('./pages/FirebaseAuthHandler'));
const PublicInstagramReportPage = React.lazy(() => import('./pages/PublicInstagramReportPage'));
const DemoInstagramReportPage = React.lazy(() => import('./pages/DemoInstagramReportPage'));
const NotificationsPage       = React.lazy(() => import('./pages/NotificationsPage'));
const WorkloadPage            = React.lazy(() => import('./pages/WorkloadPage'));
const TeamDirectoryPage       = React.lazy(() => import('./pages/TeamDirectoryPage'));
const SlackCallback           = React.lazy(() => import('./pages/SlackCallback'));
const GraphicProjectTracker   = React.lazy(() => import('./pages/GraphicProjectTracker'));
const CanvasPage              = React.lazy(() => import('./pages/CanvasPage'));
const MyClientsPage           = React.lazy(() => import('./modules/my-clients/pages/MyClientsPage'));

// Admin utilities — expose to console for migrations (must be after all imports)
if (typeof window !== 'undefined') {
  window.importClients = importClients;
  window.firestoreService = firestoreService;
}

// ── Shared loading fallback ───────────────────────────────────────────────────
function PageSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function CanvasRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/workspaces${search}`} replace />;
}

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
  useAnalyticsTracker();
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
  if (loading) return <V3Login />;
  if (currentUser) return <Navigate to="/dashboard" replace />;
  return <V3Login />;
}

// ============================================================================
// PROTECTED APP - Requires authentication
// ============================================================================
function ProtectedApp() {
  const { currentUser, loading } = useAuth();

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

  if (!currentUser) return <Navigate to="/login" replace />;

  // Suspense here catches lazy-loaded page chunks; sidebar stays visible during loads
  return (
    <Suspense fallback={<PageSpinner />}>
      <V3Layout />
    </Suspense>
  );
}

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      // Public Instagram reports first so /report/:id is never matched by protected catch-all
      { path: '/report/:publicLinkId', element: <Suspense fallback={<PageSpinner />}><PublicInstagramReportPage /></Suspense> },
      { path: '/report-demo',          element: <Suspense fallback={<PageSpinner />}><DemoInstagramReportPage /></Suspense> },

      // Public routes (no auth required)
      { path: '/login',                        element: <LoginPage /> },
      { path: '/client-login',                 element: <Suspense fallback={<PageSpinner />}><ClientLogin /></Suspense> },
      { path: '/client-password-reset',        element: <Suspense fallback={<PageSpinner />}><ClientPasswordReset /></Suspense> },
      { path: '/client-waiting-for-approval',  element: <Suspense fallback={<PageSpinner />}><ClientWaitingForApproval /></Suspense> },
      { path: '/waiting-for-approval',         element: <Suspense fallback={<PageSpinner />}><WaitingForApproval /></Suspense> },
      { path: '/__/auth/action',               element: <Suspense fallback={<PageSpinner />}><FirebaseAuthHandler /></Suspense> },

      // OAuth callbacks
      { path: '/slack-callback', element: <Suspense fallback={<PageSpinner />}><SlackCallback /></Suspense> },

      // Protected app routes (requires auth)
      {
        path: '/',
        element: <ProtectedApp />,
        children: [
          { index: true,   element: <V3Dashboard /> },
          { path: 'dashboard', element: <V3Dashboard /> },

          { path: 'tasks',           element: <PermissionRoute pageId="tasks" pageName="Tasks"><TasksPage /></PermissionRoute> },
          { path: 'my-clients',      element: <PermissionRoute pageId="my-clients" pageName="My Clients"><MyClientsPage /></PermissionRoute> },
          { path: 'clients',         element: <PermissionRoute pageId="clients" pageName="Client Management"><ClientsPage /></PermissionRoute> },
          { path: 'posting-packages', element: <PermissionRoute pageId="posting-packages" pageName="Posting Packages"><PostingPackages /></PermissionRoute> },
          { path: 'pending-clients', element: <Navigate to="/clients?tab=pending" replace /> },
          { path: 'content-calendar', element: <PermissionRoute pageId="content-calendar" pageName="Content Calendar"><ContentCalendar /></PermissionRoute> },
          { path: 'content-calendar/post-due/:id', element: <PermissionRoute pageId="content-calendar" pageName="Content Calendar"><ContentCalendarPostDue /></PermissionRoute> },
          { path: 'crm',             element: <PermissionRoute pageId="crm" pageName="CRM"><CRMPage /></PermissionRoute> },
          { path: 'team',            element: <PermissionRoute pageId="team" pageName="Team Management"><TeamManagement /></PermissionRoute> },
          { path: 'hr-calendar',     element: <PermissionRoute pageId="hr-calendar" pageName="HR Calendar"><HRCalendar /></PermissionRoute> },
          { path: 'hr-analytics',    element: <PermissionRoute pageId="hr-analytics" pageName="HR Analytics"><HRAnalytics /></PermissionRoute> },
          { path: 'client-health',   element: <PermissionRoute pageId="client-health" pageName="Client Health"><ClientHealthPage /></PermissionRoute> },
          { path: 'it-support',      element: <PermissionRoute pageId="it-support" pageName="IT Support"><ITSupportPage /></PermissionRoute> },
          { path: 'tutorials',       element: <Navigate to="/features#tutorials" replace /> },
          { path: 'resources',       element: <PermissionRoute pageId="resources" pageName="Resources"><ResourcesPage /></PermissionRoute> },
          { path: 'features',        element: <PermissionRoute pageId="features" pageName="Add-ons"><FeaturesPage /></PermissionRoute> },
          { path: 'workload',        element: <PermissionRoute pageId="workload" pageName="Team Workload"><WorkloadPage /></PermissionRoute> },
          { path: 'graphic-projects', element: <PermissionRoute pageId="graphic-projects" pageName="Team Projects"><GraphicProjectTracker /></PermissionRoute> },
          { path: 'workspaces',      element: <PermissionRoute pageId="canvas" pageName="Workspaces"><CanvasPage /></PermissionRoute> },
          { path: 'canvas',          element: <CanvasRedirect /> },

          { path: 'my-time-off',        element: <MyTimeOff /> },
          { path: 'self-service',       element: <EmployeeSelfService /> },
          { path: 'team-directory',     element: <TeamDirectoryPage /> },
          { path: 'feedback-support',   element: <FeedbackSupportPage /> },
          { path: 'onboarding',         element: <OnboardingPage /> },
          { path: 'content-manager-message',        element: <ContentManagerMessage /> },
          { path: 'admin-message',                  element: <AdminMessage /> },
          { path: 'director-message',               element: <DirectorMessage /> },
          { path: 'social-media-manager-message',   element: <SocialMediaManagerMessage /> },
          { path: 'graphic-designer-message',       element: <GraphicDesignerMessage /> },
          { path: 'hr-manager-message',             element: <HRManagerMessage /> },
          { path: 'sales-manager-message',          element: <SalesManagerMessage /> },
          { path: 'notifications',      element: <NotificationsPage /> },

          { path: 'permissions',        element: <PermissionsManager /> },
          { path: 'announcements',      element: <AnnouncementManager /> },
          { path: 'instagram-reports',  element: <InstagramReportsPage /> },

          { path: 'meta-callback',      element: <MetaCallback /> },

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
      <ViewAsProvider>
        <AuthProvider>
          <PermissionsProvider>
            <CustomLocationsProvider>
            <ClientsProvider>
              <ConfirmProvider>
                <RouterProvider router={router} />
                <MobileInstallPrompt />
                <NewVersionNotifier />
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
            </ClientsProvider>
            </CustomLocationsProvider>
          </PermissionsProvider>
        </AuthProvider>
      </ViewAsProvider>
    </PendingUsersProvider>
  );
}

export default App;
