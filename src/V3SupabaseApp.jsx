/**
 * V3SupabaseApp.jsx
 *
 * Mounts the ORIGINAL V3 UI at /v4/* with Supabase providers.
 * Zero UI changes — same pages, same layout, same components.
 *
 * Auth layer:  AuthContext.supabase.js  (Supabase Auth)
 * Data layer:  supabaseFirestoreService (same API as firestoreService)
 *              → pages still import { firestoreService } from './services/firestoreService'
 *                After the data migration runs (Phase 5), swap that one file to complete cutover.
 *
 * Registered in App.jsx at path '/v4/*' (replaces old V4App).
 *
 * Testing:
 *   Navigate directly to /v4/dashboard, /v4/clients, etc.
 *   Sidebar links navigate to /[page] (the Firebase production app) — that is expected.
 *   For full in-app navigation under /v4/, the final cutover step remounts everything at /.
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// ── Supabase providers ────────────────────────────────────────────────────────
import { AuthProvider, useAuth } from './contexts/AuthContext.supabase';

// ── Existing V3 context providers (data-layer-agnostic) ──────────────────────
import { ViewAsProvider } from './contexts/ViewAsContext';
import { PendingUsersProvider } from './contexts/PendingUsersContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { CustomLocationsProvider } from './contexts/CustomLocationsContext';
import { ClientsProvider } from './contexts/ClientsContext';
import { ConfirmProvider } from './contexts/ConfirmContext';

// ── Navigation utility ────────────────────────────────────────────────────────
import { setNavigate } from './utils/navigation';

// ── V3 layout / login / shared components ────────────────────────────────────
import V3Layout from './v3-app/components/Layout';
import V3Login from './v3-app/components/Login';
import V3Dashboard from './v3-app/components/Dashboard';
import PermissionRoute from './v3-app/components/PermissionRoute';
import PermissionsManager from './v3-app/pages/PermissionsManager';
import AnnouncementManager from './v3-app/pages/AnnouncementManager';

// ── V3 Styles ─────────────────────────────────────────────────────────────────
import './v3-app/styles/globals.css';

// ── V3 Pages ─────────────────────────────────────────────────────────────────
import TasksPage from './pages/TasksPage';
import ClientsPage from './pages/ClientsPage';
import PostingPackages from './pages/PostingPackages';
import ContentCalendar from './pages/ContentCalendar';
import ContentCalendarPostDue from './pages/ContentCalendarPostDue';
import CRMPage from './pages/CRMPage';
import TeamManagement from './pages/TeamManagement';
import HRCalendar from './pages/HRCalendar';
import HRAnalytics from './pages/HRAnalytics';
import ClientHealthPage from './pages/ClientHealthPage';
import ITSupportPage from './pages/ITSupportPage';
import FeedbackSupportPage from './pages/FeedbackSupportPage';
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
import NotificationsPage from './pages/NotificationsPage';
import WorkloadPage from './pages/WorkloadPage';
import TeamDirectoryPage from './pages/TeamDirectoryPage';
import SlackCallback from './pages/SlackCallback';
import GraphicProjectTracker from './pages/GraphicProjectTracker';
import CanvasPage from './pages/CanvasPage';
import MyClientsPage from './modules/my-clients/pages/MyClientsPage';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
      <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** Wires the shared appNavigate() to this sub-router's navigate function */
function NavigateSetter() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  return null;
}

/**
 * OAuth callback landing page.
 * Supabase detects the access_token in the URL hash and fires onAuthStateChange.
 * We just redirect to the dashboard — AuthContext.supabase.js handles the rest.
 */
function AuthCallback() {
  const { currentUser, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (currentUser) return <Navigate to="/v4/dashboard" replace />;
  return <Navigate to="/v4/login" replace />;
}

/** Login page: shows V3Login but redirects to /v4/dashboard if already authed */
function LoginPage() {
  const { currentUser, loading } = useAuth();
  if (loading) return <V3Login />;
  if (currentUser) return <Navigate to="/v4/dashboard" replace />;
  return <V3Login />;
}

/** Protected wrapper: requires Supabase auth */
function ProtectedApp() {
  const { currentUser, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!currentUser) return <Navigate to="/v4/login" replace />;

  return <V3Layout />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route tree
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All routes are relative to the parent /v4/* match in App.jsx.
 * So `path="dashboard"` matches /v4/dashboard.
 */
function V3SupabaseRoutes() {
  return (
    <React.Suspense fallback={<PageLoader />}>
      <NavigateSetter />
      <Routes>
        {/* OAuth redirect callback */}
        <Route path="auth/callback" element={<AuthCallback />} />

        {/* Public */}
        <Route path="login" element={<LoginPage />} />
        <Route path="slack-callback" element={<SlackCallback />} />

        {/* Protected: requires Supabase auth → renders V3Layout with child routes */}
        <Route path="/" element={<ProtectedApp />}>
          <Route index element={<Navigate to="/v4/dashboard" replace />} />
          <Route path="dashboard" element={<V3Dashboard />} />

          {/* Permission-gated pages */}
          <Route path="tasks" element={<PermissionRoute pageId="tasks" pageName="Tasks"><TasksPage /></PermissionRoute>} />
          <Route path="my-clients" element={<PermissionRoute pageId="my-clients" pageName="My Clients"><MyClientsPage /></PermissionRoute>} />
          <Route path="clients" element={<PermissionRoute pageId="clients" pageName="Client Management"><ClientsPage /></PermissionRoute>} />
          <Route path="posting-packages" element={<PermissionRoute pageId="posting-packages" pageName="Posting Packages"><PostingPackages /></PermissionRoute>} />
          <Route path="pending-clients" element={<Navigate to="/v4/clients?tab=pending" replace />} />
          <Route path="content-calendar" element={<PermissionRoute pageId="content-calendar" pageName="Content Calendar"><ContentCalendar /></PermissionRoute>} />
          <Route path="content-calendar/post-due/:id" element={<PermissionRoute pageId="content-calendar" pageName="Content Calendar"><ContentCalendarPostDue /></PermissionRoute>} />
          <Route path="crm" element={<PermissionRoute pageId="crm" pageName="CRM"><CRMPage /></PermissionRoute>} />
          <Route path="team" element={<PermissionRoute pageId="team" pageName="Team Management"><TeamManagement /></PermissionRoute>} />
          <Route path="hr-calendar" element={<PermissionRoute pageId="hr-calendar" pageName="HR Calendar"><HRCalendar /></PermissionRoute>} />
          <Route path="hr-analytics" element={<PermissionRoute pageId="hr-analytics" pageName="HR Analytics"><HRAnalytics /></PermissionRoute>} />
          <Route path="client-health" element={<PermissionRoute pageId="client-health" pageName="Client Health"><ClientHealthPage /></PermissionRoute>} />
          <Route path="it-support" element={<PermissionRoute pageId="it-support" pageName="IT Support"><ITSupportPage /></PermissionRoute>} />
          <Route path="resources" element={<PermissionRoute pageId="resources" pageName="Resources"><ResourcesPage /></PermissionRoute>} />
          <Route path="features" element={<PermissionRoute pageId="features" pageName="Add-ons"><FeaturesPage /></PermissionRoute>} />
          <Route path="workload" element={<PermissionRoute pageId="workload" pageName="Team Workload"><WorkloadPage /></PermissionRoute>} />
          <Route path="graphic-projects" element={<PermissionRoute pageId="graphic-projects" pageName="Team Projects"><GraphicProjectTracker /></PermissionRoute>} />
          <Route path="workspaces" element={<PermissionRoute pageId="canvas" pageName="Workspaces"><CanvasPage /></PermissionRoute>} />
          <Route path="canvas" element={<Navigate to="/v4/workspaces" replace />} />
          <Route path="instagram-reports" element={<InstagramReportsPage />} />

          {/* Always-accessible profile pages */}
          <Route path="my-time-off" element={<MyTimeOff />} />
          <Route path="self-service" element={<EmployeeSelfService />} />
          <Route path="team-directory" element={<TeamDirectoryPage />} />
          <Route path="feedback-support" element={<FeedbackSupportPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          {/* Message / welcome pages */}
          <Route path="content-manager-message" element={<ContentManagerMessage />} />
          <Route path="admin-message" element={<AdminMessage />} />
          <Route path="director-message" element={<DirectorMessage />} />
          <Route path="social-media-manager-message" element={<SocialMediaManagerMessage />} />
          <Route path="graphic-designer-message" element={<GraphicDesignerMessage />} />
          <Route path="hr-manager-message" element={<HRManagerMessage />} />
          <Route path="sales-manager-message" element={<SalesManagerMessage />} />

          {/* Admin */}
          <Route path="permissions" element={<PermissionsManager />} />
          <Route path="announcements" element={<AnnouncementManager />} />

          {/* OAuth */}
          <Route path="meta-callback" element={<MetaCallback />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/v4/dashboard" replace />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — wraps everything in Supabase + shared providers
// ─────────────────────────────────────────────────────────────────────────────

export default function V3SupabaseApp() {
  return (
    <PendingUsersProvider>
      <ViewAsProvider>
        <AuthProvider>
          <PermissionsProvider>
            <CustomLocationsProvider>
              <ClientsProvider>
                <ConfirmProvider>
                  <V3SupabaseRoutes />
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 3000,
                      style: { background: '#333', color: '#fff', borderRadius: '8px' },
                      success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
                      error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
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
