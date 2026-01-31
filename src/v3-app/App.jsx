import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// V3 Layout and Components (Apple-styled)
import V3Layout from './components/Layout';
import V3Login from './components/Login';
import V3Dashboard from './components/Dashboard';
import PermissionRoute from './components/PermissionRoute';

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
import PermissionsManager from './pages/PermissionsManager';

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
  const { currentUser } = useAuth();

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
              
              {/* Dashboard - always accessible */}
              <Route path="dashboard" element={<V3Dashboard />} />
              
              {/* Permission-protected pages */}
              <Route path="tasks" element={
                <PermissionRoute pageId="tasks" pageName="Tasks">
                  <TasksPage />
                </PermissionRoute>
              } />
              <Route path="clients" element={
                <PermissionRoute pageId="clients" pageName="Clients">
                  <ClientsPage />
                </PermissionRoute>
              } />
              <Route path="client-packages" element={
                <PermissionRoute pageId="client-packages" pageName="Client Packages">
                  <ClientPackages />
                </PermissionRoute>
              } />
              <Route path="pending-clients" element={
                <PermissionRoute pageId="pending-clients" pageName="Pending Clients">
                  <PendingClients />
                </PermissionRoute>
              } />
              <Route path="content-calendar" element={
                <PermissionRoute pageId="content-calendar" pageName="Content Calendar">
                  <ContentCalendar />
                </PermissionRoute>
              } />
              <Route path="crm" element={
                <PermissionRoute pageId="crm" pageName="CRM">
                  <CRMPage />
                </PermissionRoute>
              } />
              <Route path="team" element={
                <PermissionRoute pageId="team" pageName="Team Management">
                  <TeamManagement />
                </PermissionRoute>
              } />
              <Route path="hr-calendar" element={
                <PermissionRoute pageId="hr-calendar" pageName="HR Calendar">
                  <HRCalendar />
                </PermissionRoute>
              } />
              <Route path="hr-analytics" element={
                <PermissionRoute pageId="hr-analytics" pageName="HR Analytics">
                  <HRAnalytics />
                </PermissionRoute>
              } />
              <Route path="analytics" element={
                <PermissionRoute pageId="analytics" pageName="Analytics">
                  <Analytics />
                </PermissionRoute>
              } />
              <Route path="user-management" element={
                <PermissionRoute pageId="user-management" pageName="User Management">
                  <UserManagement />
                </PermissionRoute>
              } />
              <Route path="it-support" element={
                <PermissionRoute pageId="it-support" pageName="IT Support">
                  <ITSupportPage />
                </PermissionRoute>
              } />
              <Route path="tutorials" element={
                <PermissionRoute pageId="tutorials" pageName="Tutorials">
                  <TutorialsPage />
                </PermissionRoute>
              } />
              <Route path="resources" element={
                <PermissionRoute pageId="resources" pageName="Resources">
                  <ResourcesPage />
                </PermissionRoute>
              } />
              
              {/* Profile pages - always accessible */}
              <Route path="my-time-off" element={<MyTimeOff />} />
              <Route path="self-service" element={<EmployeeSelfService />} />
              <Route path="onboarding" element={<OnboardingPage />} />
              <Route path="content-manager-message" element={<ContentManagerMessage />} />
              
              {/* System admin only */}
              <Route path="permissions" element={<PermissionsManager />} />
              
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
