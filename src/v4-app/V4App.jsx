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

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/v4/login" replace />;
  return children;
}

function V4Routes() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <React.Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="login" element={user ? <Navigate to="/v4/dashboard" replace /> : <Login />} />

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
      <V4Routes />
    </AuthProvider>
  );
}
