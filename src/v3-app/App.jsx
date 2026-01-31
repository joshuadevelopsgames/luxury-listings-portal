import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// V3 Layout and Components (Apple-styled)
import V3Layout from './components/Layout';
import V3Login from './components/Login';
import V3Dashboard from './components/Dashboard';

// V3 styled components that use real data where available
// For pages that don't have a V3 version yet, we use the original pages wrapped in the V3 layout
import TasksPage from '../pages/TasksPage';
import ClientsPage from '../pages/ClientsPage';
import ClientPackages from '../pages/ClientPackages';
import ContentCalendar from '../pages/ContentCalendar';
import Analytics from '../pages/Analytics';
import TeamManagement from '../pages/TeamManagement';
import HRCalendar from '../pages/HRCalendar';
import HRAnalytics from '../pages/HRAnalytics';
import TutorialsPage from '../pages/TutorialsPage';
import ResourcesPage from '../pages/ResourcesPage';
import CRMPage from '../pages/CRMPage';
import UserManagement from '../pages/UserManagement';
import ITSupportPage from '../pages/ITSupportPage';
import PendingClients from '../pages/PendingClients';
import MyTimeOff from '../pages/MyTimeOff';
import EmployeeSelfService from '../pages/EmployeeSelfService';
import OnboardingPage from '../pages/OnboardingPage';
import ContentManagerMessage from '../pages/ContentManagerMessage';

// Import styles
import './styles/globals.css';

/**
 * V3 App - Apple Design + Real Firestore Data
 * 
 * Uses Apple-styled V3 components where available:
 * - V3Dashboard (Apple design with real task data)
 * - V3Layout (Apple-styled sidebar/header)
 * - V3Login (Apple-styled login)
 * 
 * Other pages use original components wrapped in V3 layout
 * (they'll inherit some Apple styling via CSS)
 */
const V3App = () => {
  const { currentUser, loading } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#0071e3]/20 border-t-[#0071e3] rounded-full animate-spin" />
          <p className="text-[15px] text-[#86868b] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="login" element={
        currentUser ? <Navigate to="/v3/dashboard" replace /> : <V3Login />
      } />

      {/* Protected routes - all wrapped in V3Layout */}
      <Route path="/*" element={
        currentUser ? (
          <V3Layout>
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              
              {/* V3 Apple-styled Dashboard (with real task data) */}
              <Route path="dashboard" element={<V3Dashboard />} />
              
              {/* Original pages wrapped in V3 layout */}
              {/* These pages inherit Apple styling via the v3-content-wrapper CSS */}
              <Route path="tasks" element={<TasksPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="client-packages" element={<ClientPackages />} />
              <Route path="pending-clients" element={<PendingClients />} />
              <Route path="content-calendar" element={<ContentCalendar />} />
              <Route path="crm" element={<CRMPage />} />
              <Route path="team" element={<TeamManagement />} />
              <Route path="hr-calendar" element={<HRCalendar />} />
              <Route path="hr-analytics" element={<HRAnalytics />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="user-management" element={<UserManagement />} />
              <Route path="it-support" element={<ITSupportPage />} />
              <Route path="tutorials" element={<TutorialsPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="my-time-off" element={<MyTimeOff />} />
              <Route path="self-service" element={<EmployeeSelfService />} />
              <Route path="onboarding" element={<OnboardingPage />} />
              <Route path="content-manager-message" element={<ContentManagerMessage />} />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </V3Layout>
        ) : (
          <Navigate to="login" replace />
        )
      } />
    </Routes>
  );
};

export default V3App;
