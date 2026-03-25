/**
 * V4 App — Supabase-first architecture
 *
 * Mount point: /v4/*
 * Registered in the main App.jsx router as a nested route group.
 *
 * Database: Supabase (see src/v4-app/schema/supabase.sql)
 * Auth:     Supabase Auth (email/password, magic link)
 * Realtime: Supabase Realtime (engagement feed, notifications, tasks)
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { ConfirmProvider } from './contexts/ConfirmContext';

import Layout    from './components/Layout';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients   from './pages/Clients';

// Lazy-load heavier pages
const ContentCalendar   = React.lazy(() => import('./pages/ContentCalendar'));
const InstagramReports  = React.lazy(() => import('./pages/InstagramReports'));
const CRM               = React.lazy(() => import('./pages/CRM'));
const Analytics         = React.lazy(() => import('./pages/Analytics'));
const DesignProjects    = React.lazy(() => import('./pages/DesignProjects'));
const Team              = React.lazy(() => import('./pages/Team'));
const Workload          = React.lazy(() => import('./pages/Workload'));
const TimeOff           = React.lazy(() => import('./pages/TimeOff'));
const Notifications     = React.lazy(() => import('./pages/Notifications'));
const Settings          = React.lazy(() => import('./pages/Settings'));
const PostingPackages   = React.lazy(() => import('./pages/PostingPackages'));
const Tasks             = React.lazy(() => import('./pages/Tasks'));
const ClientHealth      = React.lazy(() => import('./pages/ClientHealth'));
const ITSupport         = React.lazy(() => import('./pages/ITSupport'));
const Resources         = React.lazy(() => import('./pages/Resources'));
const Features          = React.lazy(() => import('./pages/Features'));
const HRCalendar        = React.lazy(() => import('./pages/HRCalendar'));
const HRAnalytics       = React.lazy(() => import('./pages/HRAnalytics'));
const MyClients         = React.lazy(() => import('./pages/MyClients'));
const MyTimeOff         = React.lazy(() => import('./pages/MyTimeOff'));
const SelfService       = React.lazy(() => import('./pages/SelfService'));
const TeamDirectory     = React.lazy(() => import('./pages/TeamDirectory'));
const Onboarding        = React.lazy(() => import('./pages/Onboarding'));
const FeedbackSupport   = React.lazy(() => import('./pages/FeedbackSupport'));
const PermissionsManager = React.lazy(() => import('./pages/PermissionsManager'));
const AnnouncementManager = React.lazy(() => import('./pages/AnnouncementManager'));
const Canvas            = React.lazy(() => import('./pages/Canvas'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const DEV_BYPASS = process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (DEV_BYPASS) return children;
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/v4/login" replace />;
  return children;
}

function V4Routes() {
  const { user, loading } = useAuth();

  if (!DEV_BYPASS && loading) return <PageLoader />;

  return (
    <React.Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="login" element={(DEV_BYPASS || user) ? <Navigate to="/v4/dashboard" replace /> : <Login />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"          element={<Dashboard />} />
          <Route path="clients"            element={<Clients />} />
          <Route path="content-calendar"   element={<ContentCalendar />} />
          <Route path="instagram-reports"  element={<InstagramReports />} />
          <Route path="crm"                element={<CRM />} />
          <Route path="analytics"          element={<Analytics />} />
          <Route path="design-projects"    element={<DesignProjects />} />
          <Route path="team"               element={<Team />} />
          <Route path="workload"           element={<Workload />} />
          <Route path="time-off"           element={<TimeOff />} />
          <Route path="notifications"      element={<Notifications />} />
          <Route path="tasks"                element={<Tasks />} />
          <Route path="posting-packages"    element={<PostingPackages />} />
          <Route path="client-health"      element={<ClientHealth />} />
          <Route path="it-support"         element={<ITSupport />} />
          <Route path="resources"          element={<Resources />} />
          <Route path="features"           element={<Features />} />
          <Route path="hr-calendar"        element={<HRCalendar />} />
          <Route path="hr-analytics"       element={<HRAnalytics />} />
          <Route path="my-clients"         element={<MyClients />} />
          <Route path="my-time-off"        element={<MyTimeOff />} />
          <Route path="self-service"       element={<SelfService />} />
          <Route path="team-directory"     element={<TeamDirectory />} />
          <Route path="onboarding"         element={<Onboarding />} />
          <Route path="feedback"           element={<FeedbackSupport />} />
          <Route path="permissions"        element={<PermissionsManager />} />
          <Route path="announcements"      element={<AnnouncementManager />} />
          <Route path="canvas"             element={<Canvas />} />
          <Route path="settings/*"         element={<Settings />} />
          <Route path="*"                  element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
}

export default function V4App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <ConfirmProvider>
          <V4Routes />
        </ConfirmProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}
