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
import { supabaseService } from './services/supabaseService';

// ── Always-needed (critical path) ────────────────────────────────────────────
import V3Layout from './v3-app/components/Layout';
import V3Login from './v3-app/components/Login';
import PermissionRoute from './v3-app/components/PermissionRoute';
import { RouteErrorPage } from './components/ErrorBoundary';
import './v3-app/styles/globals.css';

// ── Lazy import with auto-retry on chunk load failure ─────────────────────────
// After a deploy, Vercel purges old chunk files. If a user's browser tries to
// load a stale chunk filename, the import() 404s → ChunkLoadError. This wrapper
// catches that, purges the SW cache, and does ONE hard reload so the browser
// fetches the new index.html (with new chunk references).
function lazyRetry(importFn) {
  return React.lazy(() =>
    importFn().catch((error) => {
      // Only retry once per session to avoid infinite loops
      const hasRetried = sessionStorage.getItem('lazyRetryDone');
      if (!hasRetried) {
        sessionStorage.setItem('lazyRetryDone', '1');
        // Purge all SW caches so the reload fetches fresh assets
        if ('caches' in window) {
          caches.keys().then((names) =>
            Promise.all(names.map((n) => caches.delete(n)))
          ).then(() => window.location.reload());
        } else {
          window.location.reload();
        }
        // Return a never-resolving promise to prevent React from rendering an error
        // while the page is reloading
        return new Promise(() => {});
      }
      // Already retried — let it bubble to ErrorBoundary
      throw error;
    })
  );
}

// Clear the retry flag on successful page load so future deploys can retry again
if (sessionStorage.getItem('lazyRetryDone')) {
  sessionStorage.removeItem('lazyRetryDone');
}

// ── Lazy-loaded pages (split into separate chunks) ────────────────────────────
// webpackPrefetch: true → browser downloads in idle time after initial load,
// so navigating to these pages feels near-instant.
const V3Dashboard             = lazyRetry(() => import(/* webpackPrefetch: true */ './v3-app/components/Dashboard'));
const PermissionsManager      = lazyRetry(() => import('./v3-app/pages/PermissionsManager'));
const AnnouncementManager     = lazyRetry(() => import('./v3-app/pages/AnnouncementManager'));

const TasksPage               = lazyRetry(() => import(/* webpackPrefetch: true */ './pages/TasksPage'));
const ClientsPage             = lazyRetry(() => import(/* webpackPrefetch: true */ './pages/ClientsPage'));
const PostingPackages         = lazyRetry(() => import(/* webpackPrefetch: true */ './pages/PostingPackages'));
const ContentCalendar         = lazyRetry(() => import(/* webpackPrefetch: true */ './pages/ContentCalendar'));
const ContentCalendarPostDue  = lazyRetry(() => import('./pages/ContentCalendarPostDue'));
const CRMPage                 = lazyRetry(() => import(/* webpackPrefetch: true */ './pages/CRMPage'));
const TeamManagement          = lazyRetry(() => import('./pages/TeamManagement'));
const HRCalendar              = lazyRetry(() => import('./pages/HRCalendar'));
const HRAnalytics             = lazyRetry(() => import('./pages/HRAnalytics'));
const ClientHealthPage        = lazyRetry(() => import('./pages/ClientHealthPage'));
const ITSupportPage           = lazyRetry(() => import('./pages/ITSupportPage'));
const FeedbackSupportPage     = lazyRetry(() => import('./pages/FeedbackSupportPage'));
const ResourcesPage           = lazyRetry(() => import('./pages/ResourcesPage'));
const FeaturesPage            = lazyRetry(() => import('./pages/FeaturesPage'));
const MyTimeOff               = lazyRetry(() => import('./pages/MyTimeOff'));
const EmployeeSelfService     = lazyRetry(() => import('./pages/EmployeeSelfService'));
const OnboardingPage          = lazyRetry(() => import('./pages/OnboardingPage'));
const ContentManagerMessage   = lazyRetry(() => import('./pages/ContentManagerMessage'));
const AdminMessage            = lazyRetry(() => import('./pages/AdminMessage'));
const DirectorMessage         = lazyRetry(() => import('./pages/DirectorMessage'));
const SocialMediaManagerMessage = lazyRetry(() => import('./pages/SocialMediaManagerMessage'));
const GraphicDesignerMessage  = lazyRetry(() => import('./pages/GraphicDesignerMessage'));
const HRManagerMessage        = lazyRetry(() => import('./pages/HRManagerMessage'));
const SalesManagerMessage     = lazyRetry(() => import('./pages/SalesManagerMessage'));
const InstagramReportsPage    = lazyRetry(() => import('./pages/InstagramReportsPage'));
const MetaCallback            = lazyRetry(() => import('./pages/MetaCallback'));
const WaitingForApproval      = lazyRetry(() => import('./pages/WaitingForApproval'));
const ClientLogin             = lazyRetry(() => import('./pages/ClientLogin'));
const ClientWaitingForApproval = lazyRetry(() => import('./pages/ClientWaitingForApproval'));
const ClientPasswordReset     = lazyRetry(() => import('./pages/ClientPasswordReset'));
const FirebaseAuthHandler     = lazyRetry(() => import('./pages/FirebaseAuthHandler'));
const PublicInstagramReportPage = lazyRetry(() => import('./pages/PublicInstagramReportPage'));
const DemoInstagramReportPage = lazyRetry(() => import('./pages/DemoInstagramReportPage'));
const NotificationsPage       = lazyRetry(() => import('./pages/NotificationsPage'));
const WorkloadPage            = lazyRetry(() => import('./pages/WorkloadPage'));
const TeamDirectoryPage       = lazyRetry(() => import('./pages/TeamDirectoryPage'));
const SlackCallback           = lazyRetry(() => import('./pages/SlackCallback'));
const GraphicProjectTracker   = lazyRetry(() => import('./pages/GraphicProjectTracker'));
const CanvasPage              = lazyRetry(() => import('./pages/CanvasPage'));
const MyClientsPage           = lazyRetry(() => import('./modules/my-clients/pages/MyClientsPage'));

// Admin utilities — expose to console for migrations (must be after all imports)
if (typeof window !== 'undefined') {
  window.importClients = importClients;
  window.supabaseService = supabaseService;
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
  const { currentUser, loading, authHydrated } = useAuth();

  // If auth is still loading or hydrating, show the login form (non-blocking).
  // But if the URL hash contains auth tokens (OAuth redirect landing on /login),
  // show a spinner instead — Supabase is processing the token exchange.
  if ((loading || !authHydrated) && window.location.hash?.includes('access_token=')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#86868b] text-sm">Signing in...</p>
        </div>
      </div>
    );
  }
  if (loading) return <V3Login />;
  if (currentUser) return <Navigate to="/dashboard" replace />;
  return <V3Login />;
}

// ============================================================================
// PROTECTED APP - Requires authentication
// ============================================================================
function ProtectedApp() {
  const { currentUser, loading } = useAuth();

  // Show spinner while auth is loading (no display cache) OR while an OAuth
  // redirect is being processed (URL has #access_token=... hash fragment).
  const hashHasAuthTokens = window.location.hash?.includes('access_token=');
  if (loading || (!currentUser && hashHasAuthTokens)) {
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
